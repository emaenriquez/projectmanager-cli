import { DatabaseConnection } from '../DatabaseConnection';
import { Migration } from './Migration';

/**
 * Initial migration: Creates all base tables for Project Hub
 * - projects: Stores project information
 * - tags: Stores available tags
 * - project_tags: Join table for many-to-many relationship between projects and tags
 * - technologies: Stores detected technologies for projects
 */
export class InitialMigration implements Migration {
  id = '001';
  name = 'initial';
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Create all necessary tables
   */
  up(): void {
    try {
      // Create projects table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_opened DATETIME,
          is_favorite BOOLEAN DEFAULT 0,
          default_tool TEXT,
          notes TEXT
        )
      `);

      // Create tags table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create project_tags join table for many-to-many relationship
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS project_tags (
          project_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (project_id, tag_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);

      // Create technologies table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS technologies (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          version TEXT,
          category TEXT,
          detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `);

      // Create indexes on frequently queried fields
      this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)
      `);

      this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)
      `);

      this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id)
      `);

      this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id)
      `);

      this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_technologies_project_id ON technologies(project_id)
      `);

      this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_technologies_name ON technologies(name)
      `);
    } catch (error) {
      throw new Error(`Failed to run initial migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Drop all tables created by this migration
   * WARNING: This will delete all data
   */
  down(): void {
    try {
      // Drop tables in reverse order of creation (to respect foreign keys)
      this.db.execute('DROP TABLE IF EXISTS technologies');
      this.db.execute('DROP TABLE IF EXISTS project_tags');
      this.db.execute('DROP TABLE IF EXISTS tags');
      this.db.execute('DROP TABLE IF EXISTS projects');
    } catch (error) {
      throw new Error(`Failed to rollback initial migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
