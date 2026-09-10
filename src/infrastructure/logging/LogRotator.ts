import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * LogRotator handles daily log rotation, optional compression, and cleanup
 * of logs older than 30 days to prevent disk space issues
 */
export class LogRotator {
  private logsDir: string;
  private maxLogAgeDays: number = 30;
  private lastRotationDate: string;

  constructor(logsDir: string) {
    this.logsDir = logsDir;
    this.lastRotationDate = this.getTodayDateString();
  }

  /**
   * Check if logs should be rotated (new day)
   */
  public shouldRotate(): boolean {
    const today = this.getTodayDateString();
    return today !== this.lastRotationDate;
  }

  /**
   * Perform log rotation
   */
  public rotate(): void {
    try {
      const today = this.getTodayDateString();
      this.lastRotationDate = today;

      // Get yesterday's log file
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDateString = yesterday.toISOString().split('T')[0];
      const yesterdayLogFile = path.join(
        this.logsDir,
        `app-${yesterdayDateString}.log`
      );

      // Compress yesterday's log if it exists
      if (fs.existsSync(yesterdayLogFile)) {
        this.compressLogFile(yesterdayLogFile);
      }

      // Cleanup old logs
      this.cleanupOldLogs();
    } catch (err) {
      // Silently fail - logging system should not crash the app
      console.error('Log rotation failed:', err);
    }
  }

  /**
   * Cleanup logs older than configured days
   */
  public cleanupOldLogs(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return;
      }

      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > this.maxLogAgeDays) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete old log file ${file}:`, err);
          }
        }
      });
    } catch (err) {
      console.error('Cleanup old logs failed:', err);
    }
  }

  /**
   * Compress a log file using gzip
   */
  private compressLogFile(filePath: string): void {
    try {
      const compressedPath = `${filePath}.gz`;

      // Don't compress if already compressed
      if (fs.existsSync(compressedPath)) {
        fs.unlinkSync(filePath);
        return;
      }

      const source = fs.createReadStream(filePath);
      const destination = fs.createWriteStream(compressedPath);
      const gzip = zlib.createGzip();

      source
        .pipe(gzip)
        .pipe(destination)
        .on('finish', () => {
          try {
            // Delete original file after successful compression
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Failed to delete original log file:', err);
          }
        })
        .on('error', (err) => {
          console.error('Compression error:', err);
          // Keep original file if compression fails
        });
    } catch (err) {
      console.error('Log file compression failed:', err);
    }
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get logs directory
   */
  public getLogsDir(): string {
    return this.logsDir;
  }

  /**
   * Set maximum log age in days
   */
  public setMaxLogAgeDays(days: number): void {
    if (days > 0) {
      this.maxLogAgeDays = days;
    }
  }

  /**
   * Get maximum log age in days
   */
  public getMaxLogAgeDays(): number {
    return this.maxLogAgeDays;
  }
}
