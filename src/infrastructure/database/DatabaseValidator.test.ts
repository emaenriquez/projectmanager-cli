import { DatabaseValidator } from './DatabaseValidator';
import { DatabaseConnection } from './DatabaseConnection';
import { MigrationRunner } from './migrations/MigrationRunner';
import { getAllMigrations } from './migrations/index';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('DatabaseValidator', () => {
  let db: DatabaseConnection;
  let validator: DatabaseValidator;
  let testDbPath: string;

  beforeEach(() => {
    // Create test database in temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-validator-test-'));
    testDbPath = path.join(tempDir, 'test.db');

    // Create fresh database connection
    DatabaseConnection.resetInstanceForTesting();
    db = DatabaseConnection.getInstance();
    db.setTestDatabasePath(testDbPath);
    if (!db.isConnected()) {
      db.open();
    }

    // Run migrations
    const migrationRunner = new MigrationRunner();
    const migrations = getAllMigrations();
    migrationRunner.runPending(migrations);

    validator = new DatabaseValidator();
  });

  afterEach(() => {
    // Clean up
    try {
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      const dir = path.dirname(testDbPath);
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('validateSchema', () => {
    it('should validate schema successfully for a valid database', () => {
      const report = validator.validate();

      expect(report).toBeDefined();
      expect(report.schema).toBeDefined();
      expect(report.schema.isValid).toBe(true);
      expect(report.schema.missingTables).toEqual([]);
      expect(report.schema.invalidColumns).toEqual([]);
    });

    it('should detect missing tables', () => {
      // Drop projects table
      db.execute('DROP TABLE IF EXISTS projects');

      const report = validator.validate();

      expect(report.schema.isValid).toBe(false);
      expect(report.schema.missingTables).toContain('projects');
      expect(report.isValid).toBe(false);
    });

    it('should detect missing indexes', () => {
      // Drop multiple indexes
      db.execute('DROP INDEX IF EXISTS idx_projects_name');
      db.execute('DROP INDEX IF EXISTS idx_projects_path');

      const report = validator.validate();

      expect(report.schema.invalidIndexes.length).toBeGreaterThan(0);
      expect(report.schema.invalidIndexes).toContain('idx_projects_name');
    });

    it('should identify all expected indexes as valid when they exist', () => {
      const report = validator.validate();

      expect(report.schema.invalidIndexes.length).toBe(0);
    });
  });

  describe('validateConstraints', () => {
    it('should validate constraints successfully for a valid database', () => {
      const report = validator.validate();

      expect(report.constraints).toBeDefined();
      expect(report.constraints.isValid).toBe(true);
      expect(report.constraints.orphanRecords).toEqual([]);
      expect(report.constraints.violatedConstraints).toEqual([]);
    });

    it('should detect orphan records in project_tags', () => {
      // Insert orphan project_tag record
      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [
        'orphan-project-id',
        'orphan-tag-id'
      ]);
      rawDb.exec('PRAGMA foreign_keys = ON');

      const report = validator.validate();

      expect(report.constraints.isValid).toBe(false);
      expect(report.constraints.orphanRecords.length).toBeGreaterThan(0);
      expect(report.constraints.orphanRecords[0].table).toBe('project_tags');
    });

    it('should detect orphan records in technologies', () => {
      // Insert orphan technology record
      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute(
        'INSERT INTO technologies (id, project_id, name, version, category) VALUES (?, ?, ?, ?, ?)',
        ['tech-1', 'orphan-project', 'Node.js', '18.0', 'runtime']
      );
      rawDb.exec('PRAGMA foreign_keys = ON');

      const report = validator.validate();

      expect(report.constraints.isValid).toBe(false);
      expect(report.constraints.orphanRecords.length).toBeGreaterThan(0);
    });

    it('should detect duplicate unique constraint violations', () => {
      // Insert two projects with the same path
      db.execute(
        'INSERT INTO projects (id, name, path, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        ['proj-1', 'Project 1', '/path/to/project']
      );

      // Manually insert duplicate to bypass constraint
      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute(
        'INSERT INTO projects (id, name, path, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        ['proj-2', 'Project 2', '/path/to/project']
      );
      rawDb.exec('PRAGMA foreign_keys = ON');

      const report = validator.validate();

      expect(report.constraints.isValid).toBe(false);
      expect(report.constraints.violatedConstraints.length).toBeGreaterThan(0);
    });

    it('should detect NULL values in NOT NULL columns', () => {
      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');

      // Manually insert with NULL values in NOT NULL column
      db.execute(
        'INSERT INTO projects (id, name, path, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        ['proj-1', null, '/some/path']
      );

      rawDb.exec('PRAGMA foreign_keys = ON');

      const report = validator.validate();

      expect(report.constraints.isValid).toBe(false);
      const hasNullViolation = report.constraints.violatedConstraints.some(
        (v: any) => v.constraint.includes('NOT NULL')
      );
      expect(hasNullViolation).toBe(true);
    });
  });

  describe('repair', () => {
    it('should successfully repair missing tables', () => {
      // Drop projects table
      db.execute('DROP TABLE IF EXISTS projects');

      let report = validator.validate();
      expect(report.schema.missingTables).toContain('projects');

      // Repair
      report = validator.repair();
      expect(report.repairAttempted).toBe(true);

      // Should recreate table
      const projectsExists = db.queryOne(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="projects"'
      );
      expect(projectsExists?.count).toBe(1);
    });

    it('should successfully repair missing indexes', () => {
      // Drop indexes
      db.execute('DROP INDEX IF EXISTS idx_projects_name');
      db.execute('DROP INDEX IF EXISTS idx_projects_path');

      let report = validator.validate();
      expect(report.schema.invalidIndexes.length).toBeGreaterThan(0);

      // Repair
      report = validator.repair();
      expect(report.repairAttempted).toBe(true);

      // Verify indexes are recreated
      const indexExists = db.query('SELECT name FROM sqlite_master WHERE type="index" AND name="idx_projects_name"');
      expect(indexExists.length).toBeGreaterThan(0);
    });

    it('should successfully repair orphan records', () => {
      // Insert orphan record
      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [
        'orphan-project-id',
        'orphan-tag-id'
      ]);
      rawDb.exec('PRAGMA foreign_keys = ON');

      let report = validator.validate();
      expect(report.constraints.isValid).toBe(false);

      // Repair
      report = validator.repair();
      expect(report.repairAttempted).toBe(true);

      // Verify orphans are removed
      const orphans = db.query('SELECT * FROM project_tags WHERE project_id NOT IN (SELECT id FROM projects)');
      expect(orphans.length).toBe(0);
    });

    it('should set repairSuccessful flag correctly', () => {
      // Create a simple issue
      db.execute('DROP INDEX IF EXISTS idx_projects_name');

      const report = validator.repair();

      expect(report.repairAttempted).toBe(true);
      expect(report.repairSuccessful).toBe(true);
    });
  });

  describe('validate', () => {
    it('should return a complete validation report', () => {
      const report = validator.validate();

      expect(report).toBeDefined();
      expect(report.isValid).toBeDefined();
      expect(report.schema).toBeDefined();
      expect(report.constraints).toBeDefined();
      expect(Array.isArray(report.errors)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
      expect(report.repairAttempted).toBe(false);
      expect(report.repairSuccessful).toBe(false);
    });

    it('should mark database as invalid when schema is invalid', () => {
      db.execute('DROP TABLE IF EXISTS technologies');

      const report = validator.validate();

      expect(report.isValid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });

    it('should mark database as invalid when constraints are violated', () => {
      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute('INSERT INTO technologies (id, project_id, name) VALUES (?, ?, ?)', [
        'tech-1',
        'orphan-project',
        'Node.js'
      ]);
      rawDb.exec('PRAGMA foreign_keys = ON');

      const report = validator.validate();

      expect(report.isValid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });

    it('should accumulate multiple errors', () => {
      db.execute('DROP TABLE IF EXISTS projects');
      db.execute('DROP TABLE IF EXISTS tags');

      const report = validator.validate();

      expect(report.isValid).toBe(false);
      expect(report.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should accumulate warnings for missing indexes', () => {
      db.execute('DROP INDEX IF EXISTS idx_projects_name');

      const report = validator.validate();

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('idx_projects_name');
    });
  });

  describe('getValidationSummary', () => {
    it('should generate a formatted validation summary', () => {
      const report = validator.validate();
      const summary = validator.getValidationSummary(report);

      expect(summary).toContain('Database Validation Report');
      expect(summary).toContain('Status:');
      expect(summary).toContain('Errors:');
      expect(summary).toContain('Warnings:');
    });

    it('should indicate VALID status for valid database', () => {
      const report = validator.validate();
      const summary = validator.getValidationSummary(report);

      expect(summary).toContain('✓ VALID');
    });

    it('should indicate INVALID status for invalid database', () => {
      db.execute('DROP TABLE IF EXISTS projects');
      const report = validator.validate();
      const summary = validator.getValidationSummary(report);

      expect(summary).toContain('✗ INVALID');
      expect(summary).toContain('Missing table:');
    });

    it('should show repair status when repair was attempted', () => {
      db.execute('DROP INDEX IF EXISTS idx_projects_name');
      const report = validator.repair();
      const summary = validator.getValidationSummary(report);

      expect(summary).toContain('Repair Attempted:');
    });
  });

  describe('integration', () => {
    it('should detect and report all types of integrity issues', () => {
      // Create multiple issues
      db.execute('DROP TABLE IF EXISTS tags');
      db.execute('DROP INDEX IF EXISTS idx_projects_name');

      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute('INSERT INTO technologies (id, project_id, name) VALUES (?, ?, ?)', [
        'tech-1',
        'orphan-project',
        'Node.js'
      ]);
      rawDb.exec('PRAGMA foreign_keys = ON');

      const report = validator.validate();

      expect(report.isValid).toBe(false);
      expect(report.schema.isValid).toBe(false);
      expect(report.constraints.isValid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it('should successfully repair all types of issues', () => {
      // Create multiple issues
      db.execute('DROP TABLE IF EXISTS tags');
      db.execute('DROP INDEX IF EXISTS idx_projects_name');

      const rawDb = db.getRawDatabase();
      rawDb.exec('PRAGMA foreign_keys = OFF');
      db.execute('INSERT INTO technologies (id, project_id, name) VALUES (?, ?, ?)', [
        'tech-2',
        'orphan-project-2',
        'Node.js'
      ]);
      rawDb.exec('PRAGMA foreign_keys = ON');

      let report = validator.validate();
      expect(report.isValid).toBe(false);

      report = validator.repair();
      expect(report.repairAttempted).toBe(true);

      // Verify all issues are fixed
      const verifyReport = validator.validate();
      expect(verifyReport.isValid).toBe(true);
    });
  });
});
