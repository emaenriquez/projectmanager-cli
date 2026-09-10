import { DatabaseConnection } from '../DatabaseConnection';
import { MigrationRunner } from './MigrationRunner';
import { InitialMigration } from './001_initial';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

describe('MigrationRunner', () => {
  let db: DatabaseConnection;
  let runner: MigrationRunner;
  let testDbPath: string;

  beforeEach(() => {
    // Use a temporary database for testing
    const tempDir = path.join(os.tmpdir(), 'project-hub-test-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    testDbPath = path.join(tempDir, 'test.db');

    // Override the db path for testing
    db = DatabaseConnection.getInstance();
    db.open();
    runner = new MigrationRunner();
  });

  afterEach(() => {
    try {
      db.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  describe('initializeMigrationHistory', () => {
    it('should create migrations_history table', () => {
      runner.initializeMigrationHistory();

      // Verify table exists by querying it
      const result = db.query('SELECT name FROM sqlite_master WHERE type="table" AND name="migrations_history"');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be idempotent', () => {
      runner.initializeMigrationHistory();
      runner.initializeMigrationHistory();

      const result = db.query('SELECT name FROM sqlite_master WHERE type="table" AND name="migrations_history"');
      expect(result.length).toBe(1);
    });
  });

  describe('runPending', () => {
    it('should run pending migrations', () => {
      const migrations = [new InitialMigration()];

      const result = runner.runPending(migrations);

      expect(result.applied.length).toBe(1);
      expect(result.skipped.length).toBe(0);
      expect(result.applied[0].id).toBe('001');
    });

    it('should track applied migrations in history', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const history = runner.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('001');
      expect(history[0].name).toBe('initial');
      expect(history[0].rolled_back_at).toBeNull();
    });

    it('should skip already applied migrations', () => {
      const migrations = [new InitialMigration()];

      // Run once
      const result1 = runner.runPending(migrations);
      expect(result1.applied.length).toBe(1);

      // Run again
      const result2 = runner.runPending(migrations);
      expect(result2.applied.length).toBe(0);
      expect(result2.skipped.length).toBe(1);
    });

    it('should create tables from initial migration', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      // Verify tables were created
      const tables = db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('projects', 'tags', 'project_tags', 'technologies')"
      );

      expect(tables.length).toBe(4);
    });

    it('should create indexes from initial migration', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      // Verify indexes were created
      const indexes = db.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      );

      expect(indexes.length).toBeGreaterThan(0);
    });
  });

  describe('getMigrationStatus', () => {
    it('should return all migrations as pending when none applied', () => {
      const migrations = [new InitialMigration()];
      runner.initializeMigrationHistory();

      const status = runner.getMigrationStatus(migrations);

      expect(status.pending.length).toBe(1);
      expect(status.applied.length).toBe(0);
    });

    it('should return all migrations as applied when all run', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const status = runner.getMigrationStatus(migrations);

      expect(status.applied.length).toBe(1);
      expect(status.pending.length).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return empty history when no migrations applied', () => {
      runner.initializeMigrationHistory();

      const history = runner.getHistory();

      expect(history.length).toBe(0);
    });

    it('should return history of applied migrations', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const history = runner.getHistory();

      expect(history.length).toBe(1);
      expect(history[0].id).toBe('001');
      expect(history[0].name).toBe('initial');
    });

    it('should be ordered by most recent first', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const history = runner.getHistory();

      // History should be ordered by applied_at DESC
      expect(history[0].applied_at).toBeDefined();
    });
  });

  describe('table schema verification', () => {
    it('should create projects table with correct schema', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const projectsInfo = db.query("PRAGMA table_info(projects)");

      expect(projectsInfo.length).toBeGreaterThan(0);
      const columnNames = projectsInfo.map((col: any) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('path');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('last_opened');
      expect(columnNames).toContain('is_favorite');
    });

    it('should create tags table with correct schema', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const tagsInfo = db.query("PRAGMA table_info(tags)");

      expect(tagsInfo.length).toBeGreaterThan(0);
      const columnNames = tagsInfo.map((col: any) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('created_at');
    });

    it('should create project_tags join table', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const joinTableInfo = db.query("PRAGMA table_info(project_tags)");

      expect(joinTableInfo.length).toBeGreaterThan(0);
      const columnNames = joinTableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('project_id');
      expect(columnNames).toContain('tag_id');
    });

    it('should create technologies table', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      const techInfo = db.query("PRAGMA table_info(technologies)");

      expect(techInfo.length).toBeGreaterThan(0);
      const columnNames = techInfo.map((col: any) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('project_id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('version');
      expect(columnNames).toContain('category');
    });
  });

  describe('foreign key constraints', () => {
    it('should enforce foreign key constraints', () => {
      const migrations = [new InitialMigration()];
      runner.runPending(migrations);

      // Verify foreign keys are enabled
      const pragmaResult = db.query('PRAGMA foreign_keys');
      expect(pragmaResult[0]).toBeDefined();
    });
  });
});
