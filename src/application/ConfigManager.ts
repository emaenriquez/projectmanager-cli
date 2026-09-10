import * as fs from 'fs';
import * as path from 'path';
import { Config, DeepConfigKey } from '../domain/types/Config';

/**
 * ConfigManager - Manages application configuration
 * 
 * Responsibilities:
 * - Load configuration from default and user-saved files
 * - Provide get/set/reset operations
 * - Validate configuration values
 * - Persist configuration to disk
 * - Merge defaults with user-saved configuration
 */
export class ConfigManager {
  private config: Config;
  private defaultConfig: Config;
  private configPath: string;
  private defaultConfigPath: string;

  constructor(
    defaultConfigPath: string = path.join(__dirname, '../../config/default.json'),
    userConfigDir: string = this.expandHomePath('~/.project-hub')
  ) {
    this.defaultConfigPath = defaultConfigPath;
    this.configPath = path.join(userConfigDir, 'config.json');
    
    // Load default configuration
    this.defaultConfig = this.loadDefaultConfig();
    
    // Load user configuration or use defaults
    this.config = this.loadOrInitializeConfig();
  }

  /**
   * Expand ~ to home directory path
   */
  private expandHomePath(filepath: string): string {
    if (filepath === '~') {
      return process.env.HOME || process.env.USERPROFILE || '';
    }
    if (filepath.startsWith('~/')) {
      return path.join(process.env.HOME || process.env.USERPROFILE || '', filepath.slice(2));
    }
    return filepath;
  }

  /**
   * Load default configuration from default.json
   */
  private loadDefaultConfig(): Config {
    try {
      const configContent = fs.readFileSync(this.defaultConfigPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to load default configuration: ${error}`);
    }
  }

  /**
   * Load user configuration or initialize with defaults
   */
  private loadOrInitializeConfig(): Config {
    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // If user config exists, load and merge with defaults
    if (fs.existsSync(this.configPath)) {
      try {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return this.deepMerge(this.defaultConfig, userConfig);
      } catch (error) {
        // If loading fails, return defaults and log warning
        console.warn(`Failed to load user config, using defaults: ${error}`);
        return this.cloneConfig(this.defaultConfig);
      }
    }

    // Return defaults if no user config exists
    return this.cloneConfig(this.defaultConfig);
  }

  /**
   * Deep merge default and user configurations
   */
  private deepMerge(defaultConfig: Config, userConfig: any): Config {
    const result = this.cloneConfig(defaultConfig);

    for (const key in userConfig) {
      if (key in result) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null) {
          result[key as keyof Config] = {
            ...result[key as keyof Config],
            ...userConfig[key],
          };
        } else {
          result[key as keyof Config] = userConfig[key];
        }
      }
    }

    return result;
  }

  /**
   * Clone configuration object deeply
   */
  private cloneConfig(config: Config): Config {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Get configuration value by key
   * Supports nested keys like "app.name"
   */
  get(key: DeepConfigKey): any {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get entire configuration
   */
  getAll(): Config {
    return this.cloneConfig(this.config);
  }

  /**
   * Set configuration value
   * Supports nested keys like "app.name"
   */
  set(key: DeepConfigKey, value: any): void {
    this.validateConfigValue(key, value);
    
    const keys = key.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      throw new Error('Invalid configuration key');
    }

    let target: any = this.config;
    for (const k of keys) {
      if (!(k in target)) {
        target[k] = {};
      }
      target = target[k];
    }

    target[lastKey] = value;
    this.persist();
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = this.cloneConfig(this.defaultConfig);
    this.persist();
  }

  /**
   * Validate configuration value before setting
   */
  private validateConfigValue(key: DeepConfigKey, value: any): void {
    // Theme validation
    if (key === 'ui.theme') {
      if (!['dark', 'light'].includes(value)) {
        throw new Error(`Invalid theme: ${value}. Must be 'dark' or 'light'.`);
      }
    }

    // Logging level validation
    if (key === 'logging.level') {
      if (!['debug', 'info', 'warn', 'error'].includes(value)) {
        throw new Error(`Invalid logging level: ${value}. Must be 'debug', 'info', 'warn', or 'error'.`);
      }
    }

    // Scanner depth validation
    if (key === 'scanner.depth') {
      if (typeof value !== 'number' || value < 1) {
        throw new Error(`Invalid scanner depth: ${value}. Must be a positive number.`);
      }
    }

    // Items per page validation
    if (key === 'ui.itemsPerPage') {
      if (typeof value !== 'number' || value < 1) {
        throw new Error(`Invalid itemsPerPage: ${value}. Must be a positive number.`);
      }
    }

    // Patterns validation
    if (key === 'scanner.patterns') {
      if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
        throw new Error('Invalid scanner patterns. Must be an array of strings.');
      }
    }

    // Editors validation
    if (key === 'tools.editors') {
      if (!Array.isArray(value) || value.some(v => typeof v !== 'string')) {
        throw new Error('Invalid editors. Must be an array of strings.');
      }
    }
  }

  /**
   * Persist configuration to disk
   */
  private persist(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to persist configuration: ${error}`);
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get default configuration file path
   */
  getDefaultConfigPath(): string {
    return this.defaultConfigPath;
  }
}
