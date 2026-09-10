import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogRotator } from './LogRotator';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger singleton for application-wide logging
 * Writes logs to ~/.project-hub/logs/ with automatic daily rotation
 */
export class Logger {
  private static instance: Logger;
  private logsDir: string;
  private currentLogFile: string;
  private logLevel: LogLevel = 'info';
  private rotator: LogRotator;

  private constructor() {
    this.logsDir = path.join(os.homedir(), '.project-hub', 'logs');
    this.currentLogFile = this.getLogFilePath();
    this.rotator = new LogRotator(this.logsDir);
    this.ensureLogsDirectory();
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level to output
   * @param level - The log level (debug, info, warn, error)
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.log('DEBUG', message, context);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.log('INFO', message, context);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.log('WARN', message, context);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error | Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      let context: Record<string, unknown> | undefined;
      if (error instanceof Error) {
        context = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        context = error;
      }
      this.log('ERROR', message, context);
    }
  }

  /**
   * Get logs directory path
   */
  public getLogsDir(): string {
    return this.logsDir;
  }

  /**
   * Get current log file path
   */
  public getCurrentLogFile(): string {
    return this.currentLogFile;
  }

  /**
   * Rotate logs manually (useful for testing)
   */
  public rotateLogs(): void {
    this.rotator.rotate();
    this.currentLogFile = this.getLogFilePath();
  }

  /**
   * Clean up old logs (older than 30 days)
   */
  public cleanupOldLogs(): void {
    this.rotator.cleanupOldLogs();
  }

  // Private methods

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private log(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    try {
      const timestamp = new Date().toISOString();
      let logEntry = `[${timestamp}] [${level}] ${message}`;

      if (context) {
        logEntry += ` | ${JSON.stringify(context)}`;
      }

      logEntry += '\n';

      // Ensure logs directory exists (in case of external deletion)
      this.ensureLogsDirectory();

      // Check if log rotation is needed
      if (this.rotator.shouldRotate()) {
        this.rotateLogs();
      }

      // Append to current log file
      fs.appendFileSync(this.currentLogFile, logEntry, 'utf8');
    } catch (err) {
      // Silently fail if logging fails to not disrupt application
      // In production, this might be sent to a monitoring service
      console.error('Failed to write log:', err);
    }
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `app-${dateString}.log`);
  }
}
