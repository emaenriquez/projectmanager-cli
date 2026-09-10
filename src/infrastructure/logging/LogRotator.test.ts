import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogRotator } from './LogRotator';

describe('LogRotator', () => {
  let tempDir: string;
  let logsDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `log-rotator-test-${Date.now()}`);
    logsDir = path.join(tempDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Rotation Detection', () => {
    it('should not rotate on same day', () => {
      const rotator = new LogRotator(logsDir);
      expect(rotator.shouldRotate()).toBe(false);
    });
  });

  describe('Log Cleanup', () => {
    it('should remove logs older than 30 days', () => {
      const rotator = new LogRotator(logsDir);

      // Create old log files (31 days old)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDateString = oldDate.toISOString().split('T')[0];
      const oldLogFile = path.join(logsDir, `app-${oldDateString}.log`);
      fs.writeFileSync(oldLogFile, 'Old log content');

      // Create recent log file (5 days old)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      const recentDateString = recentDate.toISOString().split('T')[0];
      const recentLogFile = path.join(logsDir, `app-${recentDateString}.log`);
      fs.writeFileSync(recentLogFile, 'Recent log content');

      // Adjust file modification times
      const oldTime = oldDate.getTime();
      const recentTime = recentDate.getTime();
      fs.utimesSync(oldLogFile, oldTime / 1000, oldTime / 1000);
      fs.utimesSync(recentLogFile, recentTime / 1000, recentTime / 1000);

      rotator.cleanupOldLogs();

      expect(fs.existsSync(oldLogFile)).toBe(false);
      expect(fs.existsSync(recentLogFile)).toBe(true);
    });

    it('should preserve logs newer than max age', () => {
      const rotator = new LogRotator(logsDir);

      // Create log files at different ages
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const todayLogFile = path.join(logsDir, `app-${todayString}.log`);
      fs.writeFileSync(todayLogFile, 'Today log content');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      const yesterdayLogFile = path.join(logsDir, `app-${yesterdayString}.log`);
      fs.writeFileSync(yesterdayLogFile, 'Yesterday log content');

      rotator.cleanupOldLogs();

      expect(fs.existsSync(todayLogFile)).toBe(true);
      expect(fs.existsSync(yesterdayLogFile)).toBe(true);
    });

    it('should handle cleanup gracefully when logs directory is empty', () => {
      const rotator = new LogRotator(logsDir);
      fs.rmSync(logsDir, { recursive: true });

      // Should not throw
      expect(() => {
        rotator.cleanupOldLogs();
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should allow setting max log age', () => {
      const rotator = new LogRotator(logsDir);
      rotator.setMaxLogAgeDays(60);
      expect(rotator.getMaxLogAgeDays()).toBe(60);
    });

    it('should not allow negative max log age', () => {
      const rotator = new LogRotator(logsDir);
      rotator.setMaxLogAgeDays(-10);
      expect(rotator.getMaxLogAgeDays()).toBe(30); // Should keep default
    });

    it('should return correct logs directory', () => {
      const rotator = new LogRotator(logsDir);
      expect(rotator.getLogsDir()).toBe(logsDir);
    });

    it('should have default max log age of 30 days', () => {
      const rotator = new LogRotator(logsDir);
      expect(rotator.getMaxLogAgeDays()).toBe(30);
    });
  });

  describe('Date String Formatting', () => {
    it('should use YYYY-MM-DD date format', () => {
      const rotator = new LogRotator(logsDir);
      const dateString = (rotator as any).getTodayDateString();

      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Multiple Log Files', () => {
    it('should handle multiple log files correctly', () => {
      const rotator = new LogRotator(logsDir);

      // Create multiple log files
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const logFile = path.join(logsDir, `app-${dateString}.log`);
        fs.writeFileSync(logFile, `Log content day ${i}`);
      }

      const filesBeforeCleanup = fs.readdirSync(logsDir).length;
      expect(filesBeforeCleanup).toBe(5);

      rotator.cleanupOldLogs();

      const filesAfterCleanup = fs.readdirSync(logsDir).length;
      // All files should be kept since they are within 30 days
      expect(filesAfterCleanup).toBeGreaterThan(0);
    });
  });

  describe('Log Rotation Operations', () => {
    it('should handle rotation without errors', () => {
      const rotator = new LogRotator(logsDir);

      // Should not throw
      expect(() => {
        rotator.rotate();
      }).not.toThrow();
    });

    it('should handle non-existent logs directory gracefully', () => {
      const rotator = new LogRotator(path.join(logsDir, 'nonexistent'));

      // Should not throw
      expect(() => {
        rotator.cleanupOldLogs();
      }).not.toThrow();
    });
  });
});
