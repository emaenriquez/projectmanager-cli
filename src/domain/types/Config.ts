/**
 * Configuration types for Project Hub application
 */

export interface AppConfig {
  name: string;
  version: string;
}

export interface DatabaseConfig {
  filename: string;
}

export interface ScannerConfig {
  depth: number;
  patterns: string[];
}

export interface ToolsConfig {
  defaultEditor: string;
  editors: string[];
}

export interface UIConfig {
  theme: 'dark' | 'light';
  itemsPerPage: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  directory: string;
}

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  scanner: ScannerConfig;
  tools: ToolsConfig;
  ui: UIConfig;
  logging: LoggingConfig;
}

export type ConfigKey = keyof Config;
export type DeepConfigKey = string; // e.g., "app.name", "tools.defaultEditor"
