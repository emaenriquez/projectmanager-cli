/**
 * Migrations Module
 * Exports all migrations and migration infrastructure
 */

export { Migration } from './Migration';
export { MigrationRunner } from './MigrationRunner';
export { InitialMigration } from './001_initial';

// Array of all available migrations in order
// New migrations should be added to this array
import { InitialMigration } from './001_initial';
import { Migration } from './Migration';

export const getAllMigrations = (): Migration[] => {
  return [
    new InitialMigration(),
    // Add new migrations here in order
  ];
};
