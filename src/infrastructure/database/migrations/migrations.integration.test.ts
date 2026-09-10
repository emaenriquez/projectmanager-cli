import { DatabaseConnection } from '../DatabaseConnection';
import { MigrationRunner, getAllMigrations } from './index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Migrations Integration Tests', () => {
  let db: DatabaseConnection;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test database
    tempDir = path.join(os.tmpdir(), `project-hub-test-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    db = DatabaseConnection.getInstance();
    db.open();
  });

  afterEach(() => {
    try {
      db.close();
    } catch (e) {
      // Ignore cleanup errors
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should run all migrations successfully', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    const result = runner.runPending(migrations);

    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.skipped.length).toBe(0);
  });

  it('should create migrations_history table and track migrations', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    const history = runner.getHistory();
    expect(history.length).toBe(migrations.length);
    expect(history[0].id).toBe('001');
  });

  it('should handle empty database initialization', () => {
    const runner = new MigrationRunner();

    // Initialize without running migrations
    runner.initializeMigrationHistory();

    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations_history'");
    expect(tables.length).toBe(1);
  });

  it('should insert data into created tables', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    // Insert a test project
    db.execute(
      'INSERT INTO projects (id, name, path) VALUES (?, ?, ?)',
      ['test-id', 'Test Project', '/path/to/project']
    );

    const projects = db.query('SELECT * FROM projects WHERE id = ?', ['test-id']);
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe('Test Project');
  });

  it('should enforce unique constraint on project path', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    // Insert first project
    db.execute(
      'INSERT INTO projects (id, name, path) VALUES (?, ?, ?)',
      ['id1', 'Project 1', '/path/to/project']
    );

    // Try to insert duplicate path
    expect(() => {
      db.execute(
        'INSERT INTO projects (id, name, path) VALUES (?, ?, ?)',
        ['id2', 'Project 2', '/path/to/project']
      );
    }).toThrow();
  });

  it('should enforce unique constraint on tag name', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    // Insert first tag
    db.execute(
      'INSERT INTO tags (id, name) VALUES (?, ?)',
      ['tag-id-1', 'Python']
    );

    // Try to insert duplicate name
    expect(() => {
      db.execute(
        'INSERT INTO tags (id, name) VALUES (?, ?)',
        ['tag-id-2', 'Python']
      );
    }).toThrow();
  });

  it('should support cascading deletes for project_tags', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    // Insert test data
    db.execute(
      'INSERT INTO projects (id, name, path) VALUES (?, ?, ?)',
      ['project-1', 'Test Project', '/path/to/project']
    );

    db.execute(
      'INSERT INTO tags (id, name) VALUES (?, ?)',
      ['tag-1', 'Python']
    );

    db.execute(
      'INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)',
      ['project-1', 'tag-1']
    );

    // Verify relationship exists
    let projectTags = db.query('SELECT * FROM project_tags WHERE project_id = ?', ['project-1']);
    expect(projectTags.length).toBe(1);

    // Delete project
    db.execute('DELETE FROM projects WHERE id = ?', ['project-1']);

    // Verify project_tags was cascaded deleted
    projectTags = db.query('SELECT * FROM project_tags WHERE project_id = ?', ['project-1']);
    expect(projectTags.length).toBe(0);
  });

  it('should support cascading deletes for technologies', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    // Insert test data
    db.execute(
      'INSERT INTO projects (id, name, path) VALUES (?, ?, ?)',
      ['project-1', 'Test Project', '/path/to/project']
    );

    db.execute(
      'INSERT INTO technologies (id, project_id, name, version, category) VALUES (?, ?, ?, ?, ?)',
      ['tech-1', 'project-1', 'Python', '3.9', 'language']
    );

    // Verify technology exists
    let technologies = db.query('SELECT * FROM technologies WHERE project_id = ?', ['project-1']);
    expect(technologies.length).toBe(1);

    // Delete project
    db.execute('DELETE FROM projects WHERE id = ?', ['project-1']);

    // Verify technologies were cascaded deleted
    technologies = db.query('SELECT * FROM technologies WHERE project_id = ?', ['project-1']);
    expect(technologies.length).toBe(0);
  });

  it('should verify all indexes are created', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    const indexes = db.query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");

    expect(indexes.length).toBeGreaterThanOrEqual(6);
    
    const indexNames = indexes.map((idx: any) => idx.name);
    expect(indexNames).toContain('idx_projects_name');
    expect(indexNames).toContain('idx_projects_path');
    expect(indexNames).toContain('idx_project_tags_project_id');
  });

  it('should preserve data across database operations', () => {
    const runner = new MigrationRunner();
    const migrations = getAllMigrations();

    runner.runPending(migrations);

    // Insert multiple projects
    for (let i = 1; i <= 3; i++) {
      db.execute(
        'INSERT INTO projects (id, name, path, is_favorite) VALUES (?, ?, ?, ?)',
        [`project-${i}`, `Project ${i}`, `/path/to/project${i}`, i === 1 ? 1 : 0]
      );
    }

    // Query and verify
    const projects = db.query('SELECT * FROM projects ORDER BY id');
    expect(projects.length).toBe(3);
    expect(projects[0].is_favorite).toBe(1);
    expect(projects[1].is_favorite).toBe(0);
  });
});
