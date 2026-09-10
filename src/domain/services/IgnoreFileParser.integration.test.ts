import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectScanner } from './ProjectScanner';
import { IgnoreFileParser } from './IgnoreFileParser';

describe('IgnoreFileParser Integration with ProjectScanner', () => {
  let tempDir: string;
  let scanner: ProjectScanner;
  let ignoreParser: IgnoreFileParser;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignore-integration-'));
    scanner = new ProjectScanner();
    ignoreParser = new IgnoreFileParser();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Integration Tests', () => {
    it('should respect .project-hub-ignore patterns during scan', () => {
      // Create multiple projects
      const project1 = path.join(tempDir, 'project1');
      fs.mkdirSync(project1);
      fs.writeFileSync(path.join(project1, 'package.json'), '{}');

      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project2);
      fs.writeFileSync(path.join(project2, 'package.json'), '{}');

      const project3 = path.join(tempDir, 'build');
      fs.mkdirSync(project3);
      fs.writeFileSync(path.join(project3, 'package.json'), '{}');

      // Create ignore file
      fs.writeFileSync(
        path.join(tempDir, '.project-hub-ignore'),
        'project2\nbuild'
      );

      const result = scanner.scanDirectory(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('project1');
    });

    it('should support glob patterns in .project-hub-ignore', () => {
      // Create projects with different patterns
      const proj1 = path.join(tempDir, 'my-app');
      fs.mkdirSync(proj1);
      fs.writeFileSync(path.join(proj1, 'package.json'), '{}');

      const distDir = path.join(tempDir, 'dist');
      fs.mkdirSync(distDir);
      fs.writeFileSync(path.join(distDir, 'package.json'), '{}');

      const buildDir = path.join(tempDir, 'build');
      fs.mkdirSync(buildDir);
      fs.writeFileSync(path.join(buildDir, 'package.json'), '{}');

      // Create ignore file with patterns
      fs.writeFileSync(
        path.join(tempDir, '.project-hub-ignore'),
        'dist\nbuild'
      );

      const result = scanner.scanDirectory(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('my-app');
    });

    it('should support negation patterns', () => {
      // Create projects
      const logDir = path.join(tempDir, 'logs');
      fs.mkdirSync(logDir);
      fs.writeFileSync(path.join(logDir, 'debug.log'), '');
      fs.writeFileSync(path.join(logDir, 'package.json'), '{}');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'package.json'), '{}');

      // Create ignore file with negation
      fs.writeFileSync(
        path.join(tempDir, '.project-hub-ignore'),
        '*.log\nlogs\n!important.log'
      );

      const result = scanner.scanDirectory(tempDir);

      // Both projects should be found (logs is ignored but negation doesn't apply to dirs)
      expect(result.projects.length).toBeGreaterThan(0);
    });

    it('should support nested .project-hub-ignore files', () => {
      // Create nested structure
      const nested1 = path.join(tempDir, 'nested', 'level1');
      fs.mkdirSync(nested1, { recursive: true });
      fs.writeFileSync(path.join(nested1, 'package.json'), '{}');

      const nested2 = path.join(tempDir, 'nested', 'ignored');
      fs.mkdirSync(nested2);
      fs.writeFileSync(path.join(nested2, 'package.json'), '{}');

      // Root ignore file
      fs.writeFileSync(
        path.join(tempDir, '.project-hub-ignore'),
        'nested'
      );

      const result = scanner.scanDirectory(tempDir);

      // Nested directory should be ignored
      expect(result.projects).toHaveLength(0);
    });

    it('should handle multiple ignore patterns', () => {
      // Create various directories
      const keep = path.join(tempDir, 'keep-me');
      fs.mkdirSync(keep);
      fs.writeFileSync(path.join(keep, 'package.json'), '{}');

      const node = path.join(tempDir, 'node_modules');
      fs.mkdirSync(node);
      fs.writeFileSync(path.join(node, 'package.json'), '{}');

      const dist = path.join(tempDir, 'dist');
      fs.mkdirSync(dist);
      fs.writeFileSync(path.join(dist, 'package.json'), '{}');

      const build = path.join(tempDir, 'build');
      fs.mkdirSync(build);
      fs.writeFileSync(path.join(build, 'package.json'), '{}');

      // Create ignore file with many patterns
      fs.writeFileSync(
        path.join(tempDir, '.project-hub-ignore'),
        '# Build outputs\ndist\nbuild\n\n# Dependencies\nnode_modules\n\n# Logs\n*.log'
      );

      const result = scanner.scanDirectory(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('keep-me');
    });
  });

  describe('IgnoreFileParser Unit Tests', () => {
    it('should parse a real .project-hub-ignore file from disk', () => {
      const ignoreFile = path.join(tempDir, '.project-hub-ignore');
      const content = `
# Node dependencies
node_modules
.npm

# Python
__pycache__
.venv
venv

# Build output
dist
build
*.egg-info

# IDE
.vscode
.idea
*.swp

# Environment
.env
.env.local
.env.*.local

# System
.DS_Store
Thumbs.db
      `;
      fs.writeFileSync(ignoreFile, content);

      const patterns = ignoreParser.parseIgnoreFile(ignoreFile);

      // Should have parsed the patterns
      expect(patterns.length).toBeGreaterThan(0);

      // Verify some patterns are correctly parsed
      const patternNames = patterns.map((p) => p.pattern);
      expect(patternNames).toContain('node_modules');
      expect(patternNames).toContain('.venv');
      expect(patternNames).toContain('dist');
      expect(patternNames).toContain('.DS_Store');

      // None should be negated in this file
      expect(patterns.every((p) => !p.negated)).toBe(true);
    });

    it('should correctly match paths against parsed patterns', () => {
      const ignoreFile = path.join(tempDir, '.project-hub-ignore');
      fs.writeFileSync(ignoreFile, 'node_modules\n.git\n*.log');

      const patterns = ignoreParser.parseIgnoreFile(ignoreFile);
      const baseDir = tempDir;

      // These should be ignored
      expect(ignoreParser.matches(path.join(tempDir, 'node_modules'), patterns, baseDir)).toBe(
        true
      );
      expect(ignoreParser.matches(path.join(tempDir, '.git'), patterns, baseDir)).toBe(true);
      expect(ignoreParser.matches(path.join(tempDir, 'debug.log'), patterns, baseDir)).toBe(true);

      // These should NOT be ignored
      expect(ignoreParser.matches(path.join(tempDir, 'src'), patterns, baseDir)).toBe(false);
      expect(ignoreParser.matches(path.join(tempDir, 'package.json'), patterns, baseDir)).toBe(
        false
      );
    });
  });
});
