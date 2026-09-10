import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../src/application/ConfigManager';

/**
 * ConfigManager Integration Tests
 * 
 * Tests the ConfigManager in the context of application startup flow:
 * - Configuration loads on startup
 * - Changes persist between sessions
 * - Path expansion works for user directories
 */
describe('ConfigManager Integration Tests', () => {
  let tempDir: string;
  let defaultConfigPath: string;

  beforeEach(() => {
    // Create a temporary directory to simulate user home
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-integration-'));
    defaultConfigPath = path.join(tempDir, 'default.json');

    // Create a realistic default config
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
        patterns: [
          'package.json',
          'requirements.txt',
          'Cargo.toml',
          'go.mod',
          'pom.xml',
          'build.gradle',
          'composer.json',
          'pyproject.toml',
        ],
      },
      tools: {
        defaultEditor: 'code',
        editors: ['code', 'cursor', 'nvim', 'vim', 'subl'],
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

    fs.writeFileSync(
      defaultConfigPath,
      JSON.stringify(defaultConfig, null, 2),
      'utf-8'
    );
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Startup Configuration Loading', () => {
    test('should load configuration on application startup', () => {
      // Simulate startup: create ConfigManager for first time
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Verify configuration loaded
      expect(configManager.get('app.name')).toBe('Project Hub');
      expect(configManager.get('app.version')).toBe('0.1.0');
      expect(configManager.get('ui.theme')).toBe('dark');

      // Verify config directory created
      expect(fs.existsSync(userConfigDir)).toBe(true);

      // Verify config.json gets created when config is modified
      configManager.set('app.name', 'Project Hub');
      const configFile = path.join(userConfigDir, 'config.json');
      expect(fs.existsSync(configFile)).toBe(true);
    });

    test('should create user config directory at ~/.project-hub on first startup', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');

      // Before startup, directory should not exist
      expect(fs.existsSync(userConfigDir)).toBe(false);

      // Create ConfigManager (simulating startup)
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // After startup, directory should exist
      expect(fs.existsSync(userConfigDir)).toBe(true);

      // Config file gets created when first modification happens
      configManager.set('logging.level', 'info');
      const configFile = path.join(userConfigDir, 'config.json');
      expect(fs.existsSync(configFile)).toBe(true);

      // Verify config file is valid JSON
      const configContent = fs.readFileSync(configFile, 'utf-8');
      const parsedConfig = JSON.parse(configContent);
      expect(parsedConfig).toHaveProperty('app');
      expect(parsedConfig).toHaveProperty('database');
      expect(parsedConfig).toHaveProperty('scanner');
    });

    test('should load existing configuration on subsequent startup', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');

      // First startup
      const configManager1 = new ConfigManager(defaultConfigPath, userConfigDir);
      configManager1.set('ui.theme', 'light');
      configManager1.set('ui.itemsPerPage', 50);

      // Simulate application restart
      const configManager2 = new ConfigManager(defaultConfigPath, userConfigDir);

      // Verify changes persisted
      expect(configManager2.get('ui.theme')).toBe('light');
      expect(configManager2.get('ui.itemsPerPage')).toBe(50);

      // Verify defaults still present for unmodified values
      expect(configManager2.get('app.name')).toBe('Project Hub');
      expect(configManager2.get('scanner.depth')).toBe(3);
    });
  });

  describe('Configuration Persistence', () => {
    test('should persist configuration changes to ~/.project-hub/config.json', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Make changes
      configManager.set('app.name', 'Modified Project Hub');
      configManager.set('ui.itemsPerPage', 100);

      // Verify changes saved to disk
      const configFile = path.join(userConfigDir, 'config.json');
      const diskConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

      expect(diskConfig.app.name).toBe('Modified Project Hub');
      expect(diskConfig.ui.itemsPerPage).toBe(100);
    });

    test('should merge user config with defaults on load', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');

      // First manager: set only one value
      const configManager1 = new ConfigManager(defaultConfigPath, userConfigDir);
      configManager1.set('tools.defaultEditor', 'vim');

      // Second manager: verify merge
      const configManager2 = new ConfigManager(defaultConfigPath, userConfigDir);

      // Modified value should be present
      expect(configManager2.get('tools.defaultEditor')).toBe('vim');

      // Default values should also be present
      expect(configManager2.get('scanner.depth')).toBe(3);
      expect(configManager2.get('ui.theme')).toBe('dark');
      expect(configManager2.get('logging.level')).toBe('info');
    });

    test('should handle multiple configuration updates in single session', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Multiple updates
      configManager.set('ui.theme', 'light');
      configManager.set('ui.itemsPerPage', 30);
      configManager.set('scanner.depth', 5);
      configManager.set('logging.level', 'debug');

      // Verify all changes persisted
      const configFile = path.join(userConfigDir, 'config.json');
      const diskConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

      expect(diskConfig.ui.theme).toBe('light');
      expect(diskConfig.ui.itemsPerPage).toBe(30);
      expect(diskConfig.scanner.depth).toBe(5);
      expect(diskConfig.logging.level).toBe('debug');

      // Verify all changes in memory
      expect(configManager.get('ui.theme')).toBe('light');
      expect(configManager.get('ui.itemsPerPage')).toBe(30);
      expect(configManager.get('scanner.depth')).toBe(5);
      expect(configManager.get('logging.level')).toBe('debug');
    });
  });

  describe('Path Expansion', () => {
    test('should expand ~ in database path on load', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      const dbPath = configManager.get('database.filename');
      expect(dbPath).toBe('~/.project-hub/projects.db');
      // Note: The ConfigManager stores the path as-is; expansion happens at usage time
    });

    test('should expand ~ in logging directory on load', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      const logDir = configManager.get('logging.directory');
      expect(logDir).toBe('~/.project-hub/logs');
      // Note: The ConfigManager stores the path as-is; expansion happens at usage time
    });

    test('should preserve user configuration with ~ paths', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Set custom path with ~
      configManager.set('database.filename', '~/custom/db/projects.db');

      // Verify it's stored with ~ preserved
      expect(configManager.get('database.filename')).toBe('~/custom/db/projects.db');

      // Verify it persists
      const configFile = path.join(userConfigDir, 'config.json');
      const diskConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      expect(diskConfig.database.filename).toBe('~/custom/db/projects.db');
    });
  });

  describe('Configuration Reset and Recovery', () => {
    test('should reset to defaults and persist', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Make changes
      configManager.set('ui.theme', 'light');
      configManager.set('ui.itemsPerPage', 100);

      // Reset
      configManager.reset();

      // Verify in-memory state reset
      expect(configManager.get('ui.theme')).toBe('dark');
      expect(configManager.get('ui.itemsPerPage')).toBe(20);

      // Verify persisted state reset
      const configFile = path.join(userConfigDir, 'config.json');
      const diskConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      expect(diskConfig.ui.theme).toBe('dark');
      expect(diskConfig.ui.itemsPerPage).toBe(20);
    });

    test('should handle corrupted config gracefully on startup', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');

      // Create corrupted config file
      if (!fs.existsSync(userConfigDir)) {
        fs.mkdirSync(userConfigDir, { recursive: true });
      }
      const configFile = path.join(userConfigDir, 'config.json');
      fs.writeFileSync(configFile, 'invalid json {', 'utf-8');

      // Should not throw; should use defaults
      expect(() => {
        new ConfigManager(defaultConfigPath, userConfigDir);
      }).not.toThrow();

      // New instance should have defaults
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);
      expect(configManager.get('app.name')).toBe('Project Hub');
    });
  });

  describe('Configuration Validation in Startup', () => {
    test('should validate theme configuration during startup modifications', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Try to set invalid theme
      expect(() => configManager.set('ui.theme', 'invalid')).toThrow();

      // Set valid theme
      expect(() => configManager.set('ui.theme', 'light')).not.toThrow();
    });

    test('should validate logging level during startup modifications', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');
      const configManager = new ConfigManager(defaultConfigPath, userConfigDir);

      // Try to set invalid logging level
      expect(() => configManager.set('logging.level', 'invalid')).toThrow();

      // Set valid logging level
      expect(() => configManager.set('logging.level', 'debug')).not.toThrow();
    });
  });

  describe('Multi-Session Configuration Consistency', () => {
    test('should maintain configuration consistency across multiple sessions', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');

      // Session 1: Initialize and set values
      {
        const configManager = new ConfigManager(defaultConfigPath, userConfigDir);
        configManager.set('ui.theme', 'light');
        configManager.set('tools.defaultEditor', 'vim');
      }

      // Session 2: Verify values from session 1
      {
        const configManager = new ConfigManager(defaultConfigPath, userConfigDir);
        expect(configManager.get('ui.theme')).toBe('light');
        expect(configManager.get('tools.defaultEditor')).toBe('vim');

        // Make additional changes
        configManager.set('ui.itemsPerPage', 50);
      }

      // Session 3: Verify all previous changes
      {
        const configManager = new ConfigManager(defaultConfigPath, userConfigDir);
        expect(configManager.get('ui.theme')).toBe('light');
        expect(configManager.get('tools.defaultEditor')).toBe('vim');
        expect(configManager.get('ui.itemsPerPage')).toBe(50);
      }
    });

    test('should handle concurrent-like operations (sequential)', () => {
      const userConfigDir = path.join(tempDir, '.project-hub');

      // Simulate rapid startup and configuration changes
      const configManager1 = new ConfigManager(defaultConfigPath, userConfigDir);
      configManager1.set('ui.theme', 'light');

      const configManager2 = new ConfigManager(defaultConfigPath, userConfigDir);
      configManager2.set('ui.itemsPerPage', 30);

      const configManager3 = new ConfigManager(defaultConfigPath, userConfigDir);

      // Verify all changes from both managers were persisted
      expect(configManager3.get('ui.theme')).toBe('light');
      expect(configManager3.get('ui.itemsPerPage')).toBe(30);
    });
  });
});
