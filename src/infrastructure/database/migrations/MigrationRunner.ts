import { DatabaseConnection } from '../DatabaseConnection';
import { Migration } from './Migration';

/**
 * MigrationRunner manages the execution of database migrations
 * Tracks migration history in migrations_history table
 * Supports running pending migrations and rolling back migrations
 */
export class MigrationRunner {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Initialize the migrations_history table if it doesn't exist
   * This table tracks which migrations have been applied
   */
  public initializeMigrationHistory(): void {
    try {
      // Create migrations_history table if not exists
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS migrations_history (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          rolled_back_at DATETIME
        )
      `);
    } catch (error) {
      throw new Error(`Failed to initialize migrations_history table: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all migrations that have been applied
   */
  private getAppliedMigrations(): Map<string, any> {
    try {
      const applied = this.db.query<{ id: string; name: string; applied_at: string }>(
        'SELECT id, name, applied_at FROM migrations_history WHERE rolled_back_at IS NULL ORDER BY applied_at ASC'
      );
      
      const map = new Map<string, any>();
      for (const migration of applied) {
        map.set(migration.id, {
          name: migration.name,
          applied_at: migration.applied_at,
        });
      }
      return map;
    } catch (error) {
      throw new Error(`Failed to get applied migrations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run all pending migrations
   * Executes migrations that haven't been applied yet
   */
  public runPending(migrations: Migration[]): { applied: Migration[]; skipped: Migration[] } {
    try {
      // Initialize migration history table
      this.initializeMigrationHistory();

      const applied: Migration[] = [];
      const skipped: Migration[] = [];
      const appliedMigrations = this.getAppliedMigrations();

      for (const migration of migrations) {
        if (appliedMigrations.has(migration.id)) {
          skipped.push(migration);
          continue;
        }

        // Execute migration within a transaction
        this.db.transaction(() => {
          migration.up();

          // Record migration in history
          this.db.execute(
            'INSERT INTO migrations_history (id, name, applied_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [migration.id, migration.name]
          );
        });

        applied.push(migration);
      }

      return { applied, skipped };
    } catch (error) {
      throw new Error(`Failed to run pending migrations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rollback the most recent migration
   */
  public rollback(): Migration | null {
    try {
      this.initializeMigrationHistory();

      const lastApplied = this.db.queryOne<{
        id: string;
        name: string;
        applied_at: string;
      }>(
        'SELECT id, name, applied_at FROM migrations_history WHERE rolled_back_at IS NULL ORDER BY applied_at DESC LIMIT 1'
      );

      if (!lastApplied) {
        return null;
      }

      // Find the migration object to rollback
      // Note: This requires the caller to provide migration instances
      // For now, we'll just track the history
      const migrationId = lastApplied.id;

      this.db.transaction(() => {
        // Mark migration as rolled back
        this.db.execute(
          'UPDATE migrations_history SET rolled_back_at = CURRENT_TIMESTAMP WHERE id = ?',
          [migrationId]
        );
      });

      return {
        id: lastApplied.id,
        name: lastApplied.name,
        up: () => {
          // Placeholder - actual up() is in the migration instance
        },
        down: () => {
          // Placeholder - actual down() is in the migration instance
        },
      };
    } catch (error) {
      throw new Error(`Failed to rollback migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rollback a specific number of migrations
   */
  public rollbackN(n: number): Migration[] {
    const rolledBack: Migration[] = [];
    for (let i = 0; i < n; i++) {
      const result = this.rollback();
      if (result) {
        rolledBack.push(result);
      } else {
        break;
      }
    }
    return rolledBack;
  }

  /**
   * Get migration status - which migrations are applied and which are pending
   */
  public getMigrationStatus(migrations: Migration[]): {
    applied: Migration[];
    pending: Migration[];
  } {
    try {
      const appliedMigrations = this.getAppliedMigrations();

      const applied: Migration[] = [];
      const pending: Migration[] = [];

      for (const migration of migrations) {
        if (appliedMigrations.has(migration.id)) {
          applied.push(migration);
        } else {
          pending.push(migration);
        }
      }

      return { applied, pending };
    } catch (error) {
      throw new Error(`Failed to get migration status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all migration history records
   */
  public getHistory(): Array<{
    id: string;
    name: string;
    applied_at: string;
    rolled_back_at: string | null;
  }> {
    try {
      return this.db.query(
        'SELECT id, name, applied_at, rolled_back_at FROM migrations_history ORDER BY applied_at DESC'
      );
    } catch (error) {
      throw new Error(`Failed to get migration history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
