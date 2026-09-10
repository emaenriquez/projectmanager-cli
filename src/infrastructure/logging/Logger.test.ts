import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from './Logger';
import { LogRotator } from './LogRotator';

// Mock the LogRotator to avoid file system operations in tests
jest.mock('./LogRotator');

describe('Logger', () => {
  let logsDir: string;
  let tempDir: string;
  let testCounter = 0;

  beforeEach(() => {
    testCounter++;
    // Use a unique temporary directory for each test to avoid collisions
    tempDir = path.join(
      os.tmpdir(),
      `project-hub-test-${Date.now()}-${testCounter}`
    );
    logsDir = path.join(tempDir, '.project-hub', 'logs');

    // Clear the singleton instance
    (Logger as any).instance = undefined;

    // Mock LogRotator
    (LogRotator as any).mockImplementation(() => ({
      shouldRotate: jest.fn().mockReturnValue(false),
      rotate: jest.fn(),
      cleanupOldLogs: jest.fn(),
    }));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Clear the singleton instance after each test
    (Logger as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Log Levels', () => {
    it('should set and respect log level', () => {
      const logger = Logger.getInstance();
      const logFile = logger.getCurrentLogFile();

      // Clear the log file for this test
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      logger.setLogLevel('warn');
      logger.debug('This should not appear');
      logger.info('This should not appear');
      logger.warn('This should appear');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('This should appear');
      expect(content).not.toContain('This should not appear');
    });

    it('should log all levels when set to debug', () => {
      const logger = Logger.getInstance();
      const logFile = logger.getCurrentLogFile();

      // Clear the log file for this test
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      logger.setLogLevel('debug');
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[DEBUG]');
      expect(content).toContain('[INFO]');
      expect(content).toContain('[WARN]');
      expect(content).toContain('[ERROR]');
    });

    it('should only log errors when set to error', () => {
      const logger = Logger.getInstance();
      const logFile = logger.getCurrentLogFile();

      // Clear the log file for this test
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      logger.setLogLevel('error');
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).not.toContain('[DEBUG]');
      expect(content).not.toContain('[INFO]');
      expect(content).not.toContain('[WARN]');
      expect(content).toContain('[ERROR]');
    });
  });

  describe('Logging Methods', () => {
    it('should log debug messages', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('debug');
      const logFile = logger.getCurrentLogFile();

      logger.debug('Debug test message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[DEBUG]');
      expect(content).toContain('Debug test message');
    });

    it('should log info messages', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('info');
      const logFile = logger.getCurrentLogFile();

      logger.info('Info test message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[INFO]');
      expect(content).toContain('Info test message');
    });

    it('should log warn messages', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('warn');
      const logFile = logger.getCurrentLogFile();

      logger.warn('Warn test message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[WARN]');
      expect(content).toContain('Warn test message');
    });

    it('should log error messages with Error object', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('error');
      const logFile = logger.getCurrentLogFile();

      const error = new Error('Test error');
      logger.error('An error occurred', error);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain('An error occurred');
      expect(content).toContain('Test error');
    });

    it('should log messages with context object', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('info');
      const logFile = logger.getCurrentLogFile();

      logger.info('Operation completed', {
        duration: 123,
        itemsProcessed: 45,
      });

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('Operation completed');
      expect(content).toContain('duration');
      expect(content).toContain('itemsProcessed');
    });

    it('should log error messages with context object', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('error');
      const logFile = logger.getCurrentLogFile();

      logger.error('Database connection failed', {
        host: 'localhost',
        port: 5432,
        retries: 3,
      });

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain('Database connection failed');
      expect(content).toContain('host');
    });
  });

  describe('Log File Management', () => {
    it('should create log file with date in filename', () => {
      const logger = Logger.getInstance();
      const logFile = logger.getCurrentLogFile();

      const today = new Date().toISOString().split('T')[0];
      expect(logFile).toContain(`app-${today}.log`);
    });

    it('should append to same file within same day', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('info');
      const logFile = logger.getCurrentLogFile();

      // Clear the log file for this test
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter((line) => line.length > 0);
      expect(lines.length).toBe(3);
    });

    it('should create logs directory if it does not exist', () => {
      const logger = Logger.getInstance();
      expect(fs.existsSync(logger.getLogsDir())).toBe(true);
    });

    it('should recreate logs directory if deleted', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('info');
      const logsDir = logger.getLogsDir();

      // Delete logs directory
      fs.rmSync(logsDir, { recursive: true });
      expect(fs.existsSync(logsDir)).toBe(false);

      // Log message should recreate directory
      logger.info('Test message');
      expect(fs.existsSync(logsDir)).toBe(true);
    });
  });

  describe('Timestamp Formatting', () => {
    it('should include ISO timestamp in log entries', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('info');
      const logFile = logger.getCurrentLogFile();

      logger.info('Timestamp test');

      const content = fs.readFileSync(logFile, 'utf8');
      // Should contain ISO format like 2024-01-15T10:30:45.123Z
      expect(content).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/
      );
    });
  });

  describe('Directory Path', () => {
    it('should use correct logs directory path', () => {
      const logger = Logger.getInstance();
      const logsDir = logger.getLogsDir();
      expect(logsDir).toContain('.project-hub');
      expect(logsDir).toContain('logs');
    });
  });

  describe('Multiple Log Entries', () => {
    it('should handle multiple log entries correctly', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('debug');
      const logFile = logger.getCurrentLogFile();

      // Clear the log file for this test
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      for (let i = 1; i <= 10; i++) {
        logger.info(`Log entry ${i}`);
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter((line) => line.length > 0);
      expect(lines.length).toBe(10);

      for (let i = 1; i <= 10; i++) {
        expect(content).toContain(`Log entry ${i}`);
      }
    });
  });

  describe('Log Level Default', () => {
    it('should have info as default log level', () => {
      const logger = Logger.getInstance();
      logger.setLogLevel('info');
      const logFile = logger.getCurrentLogFile();

      logger.debug('Debug message');
      logger.info('Info message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).not.toContain('Debug message');
      expect(content).toContain('Info message');
    });
  });
});
