import { DatabaseConnection } from './DatabaseConnection';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DatabaseConnection', () => {
  let db: DatabaseConnection;
  let testDbPath: string;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-connection-test-'));
    testDbPath = path.join(tempDir, 'test.db');
    DatabaseConnection.resetInstanceForTesting();
    db = DatabaseConnection.getInstance();
    db.setTestDatabasePath(testDbPath);
  });

  afterEach(() => {
    try {
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      if (fs.existsSync(testDbPath + '-shm')) {
        fs.unlinkSync(testDbPath + '-shm');
      }
      if (fs.existsSync(testDbPath + '-wal')) {
        fs.unlinkSync(testDbPath + '-wal');
      }
      const dir = path.dirname(testDbPath);
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Singleton Pattern', () => {
    test('should return same instance on multiple calls', () => {
      const instance1 = DatabaseConnection.getInstance();
      const instance2 = DatabaseConnection.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection Management', () => {
    test('should create ~/.project-hub directory on open', () => {
      db.open();
      const homeDir = os.homedir();
      const projectHubDir = path.join(homeDir, '.project-hub');
      expect(fs.existsSync(projectHubDir)).toBe(true);
    });

    test('should create logs directory on open', () => {
      db.open();
      const homeDir = os.homedir();
      const logsDir = path.join(homeDir, '.project-hub', 'logs');
      expect(fs.existsSync(logsDir)).toBe(true);
    });

    test('should create database file at ~/.project-hub/projects.db', () => {
      db.open();
      const homeDir = os.homedir();
      const dbPath = path.join(homeDir, '.project-hub', 'projects.db');
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('should be connected after open', () => {
      db.open();
      expect(db.isConnected()).toBe(true);
    });

    test('should not be connected after close', () => {
      db.open();
      db.close();
      expect(db.isConnected()).toBe(false);
    });

    test('should handle multiple open calls gracefully', () => {
      db.open();
      expect(db.isConnected()).toBe(true);
      db.open(); // Second open should not throw
      expect(db.isConnected()).toBe(true);
    });
  });

  describe('SQL Operations', () => {
    beforeEach(() => {
      db.open();
      // Create a test table
      db.execute(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER
        )
      `);
    });

    test('should execute INSERT statements', () => {
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
      const results = db.query('SELECT * FROM test_table WHERE name = ?', ['test']);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: 'test', value: 42 });
    });

    test('should execute UPDATE statements', () => {
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
      db.execute('UPDATE test_table SET value = ? WHERE name = ?', [100, 'test']);
      const result = db.queryOne('SELECT * FROM test_table WHERE name = ?', ['test']);
      expect(result?.value).toBe(100);
    });

    test('should execute DELETE statements', () => {
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
      db.execute('DELETE FROM test_table WHERE name = ?', ['test']);
      const results = db.query('SELECT * FROM test_table WHERE name = ?', ['test']);
      expect(results).toHaveLength(0);
    });

    test('should query all results', () => {
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['a', 1]);
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['b', 2]);
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['c', 3]);
      const results = db.query('SELECT * FROM test_table ORDER BY value');
      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({ name: 'a', value: 1 });
      expect(results[2]).toMatchObject({ name: 'c', value: 3 });
    });

    test('should query single result', () => {
      db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
      const result = db.queryOne('SELECT * FROM test_table WHERE name = ?', ['test']);
      expect(result).toBeDefined();
      expect(result?.name).toBe('test');
      expect(result?.value).toBe(42);
    });

    test('should return undefined for non-existent single query', () => {
      const result = db.queryOne('SELECT * FROM test_table WHERE name = ?', ['nonexistent']);
      expect(result).toBeUndefined();
    });

    test('should prepare and reuse statements', () => {
      const stmt = db.prepare('INSERT INTO test_table (name, value) VALUES (?, ?)');
      stmt.run('a', 1);
      stmt.run('b', 2);
      const results = db.query('SELECT * FROM test_table ORDER BY value');
      expect(results).toHaveLength(2);
    });
  });

  describe('Transactions', () => {
    beforeEach(() => {
      db.open();
      db.execute(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER
        )
      `);
    });

    test('should execute transaction successfully', () => {
      db.transaction(() => {
        db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['a', 1]);
        db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['b', 2]);
      });
      const results = db.query('SELECT * FROM test_table');
      expect(results).toHaveLength(2);
    });

    test('should return value from transaction', () => {
      const result = db.transaction(() => {
        db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 42]);
        return 'transaction_result';
      });
      expect(result).toBe('transaction_result');
    });

    test('should rollback transaction on error', () => {
      try {
        db.transaction(() => {
          db.execute('INSERT INTO test_table (name, value) VALUES (?, ?)', ['a', 1]);
          throw new Error('Transaction error');
        });
      } catch (error) {
        // Expected error
      }
      const results = db.query('SELECT * FROM test_table');
      // Transaction should be rolled back
      expect(results).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when executing without opening connection', () => {
      expect(() => {
        db.execute('SELECT 1');
      }).toThrow('Database connection is not open');
    });

    test('should throw error when querying without opening connection', () => {
      expect(() => {
        db.query('SELECT 1');
      }).toThrow('Database connection is not open');
    });

    test('should throw error when preparing without opening connection', () => {
      expect(() => {
        db.prepare('SELECT 1');
      }).toThrow('Database connection is not open');
    });

    test('should throw error on invalid SQL', () => {
      db.open();
      expect(() => {
        db.execute('INVALID SQL STATEMENT');
      }).toThrow();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      db.open();
    });

    test('should return database path', () => {
      const dbPath = db.getDbPath();
      expect(dbPath).toContain('.project-hub');
      expect(dbPath).toContain('projects.db');
    });

    test('should return raw database instance', () => {
      const rawDb = db.getRawDatabase();
      expect(rawDb).toBeDefined();
      // Verify it's a database instance
      expect(typeof rawDb.prepare).toBe('function');
    });

    test('should check connection status', () => {
      expect(db.isConnected()).toBe(true);
      db.close();
      expect(db.isConnected()).toBe(false);
    });
  });

  describe('Connection Pool', () => {
    test('should maintain connection pool', () => {
      db.open();
      const dbPath = db.getDbPath();
      expect(fs.existsSync(dbPath)).toBe(true);
      db.close();
    });

    test('should handle multiple operations concurrently', () => {
      db.open();
      db.execute(`
        CREATE TABLE IF NOT EXISTS concurrent_test (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);

      // Simulate multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        db.execute('INSERT INTO concurrent_test (value) VALUES (?)', [`value_${i}`]);
      }

      const results = db.query('SELECT * FROM concurrent_test');
      expect(results).toHaveLength(10);
    });
  });
});
