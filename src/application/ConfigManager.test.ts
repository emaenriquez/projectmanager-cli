import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from './ConfigManager';

/**
 * ConfigManager Unit Tests
 */
describe('ConfigManager', () => {
  let tempDir: string;
  let defaultConfigPath: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-manager-'));
    defaultConfigPath = path.join(tempDir, 'default.json');
    
    // Create a default config file for testing
    const defaultConfig = {
      app: {
        name: 'Project Hub',
        version: '0.1.0',
      },
      database: {
        filename: '~/.project-hub/projects.db',
      },
      scanner: {
        depth: 3,
        patterns: ['package.json', 'requirements.txt'],
      },
      tools: {
        defaultEditor: 'code',
        editors: ['code', 'cursor', 'nvim'],
      },
      ui: {
        theme: 'dark',
        itemsPerPage: 20,
      },
      logging: {
        level: 'info',
        directory: '~/.project-hub/logs',
      },
    };
    
    fs.writeFileSync(defaultConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should load default configuration on initialization', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(configManager.get('app.name')).toBe('Project Hub');
    expect(configManager.get('app.version')).toBe('0.1.0');
  });

  test('should get configuration value by nested key', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(configManager.get('database.filename')).toBe('~/.project-hub/projects.db');
    expect(configManager.get('scanner.depth')).toBe(3);
    expect(configManager.get('tools.defaultEditor')).toBe('code');
    expect(configManager.get('ui.theme')).toBe('dark');
    expect(configManager.get('logging.level')).toBe('info');
  });

  test('should return undefined for invalid keys', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(configManager.get('invalid.key')).toBeUndefined();
    expect(configManager.get('app.invalid')).toBeUndefined();
  });

  test('should set configuration value by nested key', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    configManager.set('app.name', 'New Name');
    expect(configManager.get('app.name')).toBe('New Name');
    
    configManager.set('scanner.depth', 5);
    expect(configManager.get('scanner.depth')).toBe(5);
  });

  test('should persist configuration to disk', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    configManager.set('app.name', 'Persisted Name');
    
    // Create new instance and verify persistence
    const newManager = new ConfigManager(defaultConfigPath, tempDir);
    expect(newManager.get('app.name')).toBe('Persisted Name');
  });

  test('should merge default and user configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    configManager.set('app.name', 'Custom Name');
    
    // Create new instance to test merge
    const newManager = new ConfigManager(defaultConfigPath, tempDir);
    expect(newManager.get('app.name')).toBe('Custom Name');
    expect(newManager.get('scanner.depth')).toBe(3); // Should keep default
  });

  test('should reset configuration to defaults', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    configManager.set('app.name', 'Modified Name');
    configManager.reset();
    
    expect(configManager.get('app.name')).toBe('Project Hub');
  });

  test('should validate theme configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(() => configManager.set('ui.theme', 'invalid')).toThrow(
      "Invalid theme: invalid. Must be 'dark' or 'light'."
    );
    
    configManager.set('ui.theme', 'light');
    expect(configManager.get('ui.theme')).toBe('light');
  });

  test('should validate logging level configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(() => configManager.set('logging.level', 'invalid')).toThrow(
      "Invalid logging level: invalid. Must be 'debug', 'info', 'warn', or 'error'."
    );
    
    configManager.set('logging.level', 'debug');
    expect(configManager.get('logging.level')).toBe('debug');
  });

  test('should validate scanner depth configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(() => configManager.set('scanner.depth', 0)).toThrow(
      'Invalid scanner depth: 0. Must be a positive number.'
    );
    
    expect(() => configManager.set('scanner.depth', -1)).toThrow(
      'Invalid scanner depth: -1. Must be a positive number.'
    );
    
    configManager.set('scanner.depth', 10);
    expect(configManager.get('scanner.depth')).toBe(10);
  });

  test('should validate itemsPerPage configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(() => configManager.set('ui.itemsPerPage', 0)).toThrow(
      'Invalid itemsPerPage: 0. Must be a positive number.'
    );
    
    configManager.set('ui.itemsPerPage', 50);
    expect(configManager.get('ui.itemsPerPage')).toBe(50);
  });

  test('should validate scanner patterns configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(() => configManager.set('scanner.patterns', 'invalid')).toThrow(
      'Invalid scanner patterns. Must be an array of strings.'
    );
    
    expect(() => configManager.set('scanner.patterns', [1, 2, 3])).toThrow(
      'Invalid scanner patterns. Must be an array of strings.'
    );
    
    const patterns = ['pom.xml', 'build.gradle'];
    configManager.set('scanner.patterns', patterns);
    expect(configManager.get('scanner.patterns')).toEqual(patterns);
  });

  test('should validate editors configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(() => configManager.set('tools.editors', 'invalid')).toThrow(
      'Invalid editors. Must be an array of strings.'
    );
    
    const editors = ['code', 'vim', 'nvim'];
    configManager.set('tools.editors', editors);
    expect(configManager.get('tools.editors')).toEqual(editors);
  });

  test('should return all configuration', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    const allConfig = configManager.getAll();
    
    expect(allConfig).toHaveProperty('app');
    expect(allConfig).toHaveProperty('database');
    expect(allConfig).toHaveProperty('scanner');
    expect(allConfig).toHaveProperty('tools');
    expect(allConfig).toHaveProperty('ui');
    expect(allConfig).toHaveProperty('logging');
  });

  test('should handle configuration directory creation', () => {
    const newDir = path.join(tempDir, 'new', 'nested', 'directory');
    configManager = new ConfigManager(defaultConfigPath, newDir);
    
    expect(fs.existsSync(newDir)).toBe(true);
    configManager.set('app.name', 'Test');
    expect(fs.existsSync(path.join(newDir, 'config.json'))).toBe(true);
  });

  test('should return configuration file paths', () => {
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    
    expect(configManager.getDefaultConfigPath()).toBe(defaultConfigPath);
    expect(configManager.getConfigPath()).toBe(path.join(tempDir, 'config.json'));
  });

  test('should handle corrupted user config gracefully', () => {
    // Create a corrupted config file
    const configFile = path.join(tempDir, 'config.json');
    fs.writeFileSync(configFile, 'invalid json {', 'utf-8');
    
    // Should not throw, should use defaults
    configManager = new ConfigManager(defaultConfigPath, tempDir);
    expect(configManager.get('app.name')).toBe('Project Hub');
  });
});
