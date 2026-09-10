/**
 * Migration interface defines the structure for database schema migrations
 * Each migration must implement this interface to be executable by MigrationRunner
 */
export interface Migration {
  /**
   * Unique identifier for the migration
   * Format: timestamp or sequential number (e.g., "001", "20240101120000")
   */
  id: string;

  /**
   * Human-readable name describing the migration
   * Example: "create_projects_table", "add_tags_support"
   */
  name: string;

  /**
   * Execute the migration (apply changes forward)
   * Should contain SQL statements that modify the schema
   */
  up(): void;

  /**
   * Rollback the migration (revert changes)
   * Should contain SQL statements that revert the changes from up()
   */
  down(): void;
}
