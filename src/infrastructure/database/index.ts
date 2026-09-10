/**
 * Database Infrastructure Module
 * Exports database connection and related utilities
 */

export { DatabaseConnection } from './DatabaseConnection';
export type { default as Database } from 'better-sqlite3';
export { Migration, MigrationRunner, InitialMigration, getAllMigrations } from './migrations';
