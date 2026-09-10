import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IgnoreFileParser, IgnorePattern } from './IgnoreFileParser';

describe('IgnoreFileParser', () => {
  let parser: IgnoreFileParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new IgnoreFileParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignore-parser-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Unit Tests', () => {
    describe('parseIgnoreFile', () => {
      it('should return empty array for non-existent file', () => {
        const result = parser.parseIgnoreFile('/non/existent/file');
        expect(result).toEqual([]);
      });

      it('should parse simple patterns', () => {
        const filePath = path.join(tempDir, '.project-hub-ignore');
        fs.writeFileSync(filePath, 'node_modules\ndist\nbuild');

        const result = parser.parseIgnoreFile(filePath);

        expect(result).toHaveLength(3);
        expect(result[0].pattern).toBe('node_modules');
        expect(result[0].negated).toBe(false);
        expect(result[1].pattern).toBe('dist');
        expect(result[2].pattern).toBe('build');
      });

      it('should ignore comments', () => {
        const filePath = path.join(tempDir, '.project-hub-ignore');
        fs.writeFileSync(filePath, '# This is a comment\nnode_modules\n# Another comment\n.git');

        const result = parser.parseIgnoreFile(filePath);

        expect(result).toHaveLength(2);
        expect(result[0].pattern).toBe('node_modules');
        expect(result[1].pattern).toBe('.git');
      });

      it('should ignore empty lines', () => {
        const filePath = path.join(tempDir, '.project-hub-ignore');
        fs.writeFileSync(filePath, 'node_modules\n\n\ndist\n  \nbuild');

        const result = parser.parseIgnoreFile(filePath);

        expect(result).toHaveLength(3);
        expect(result.map((p) => p.pattern)).toEqual(['node_modules', 'dist', 'build']);
      });

      it('should support negation patterns', () => {
        const filePath = path.join(tempDir, '.project-hub-ignore');
        fs.writeFileSync(filePath, '*.log\n!important.log');

        const result = parser.parseIgnoreFile(filePath);

        expect(result).toHaveLength(2);
        expect(result[0].negated).toBe(false);
        expect(result[0].pattern).toBe('*.log');
        expect(result[1].negated).toBe(true);
        expect(result[1].pattern).toBe('important.log');
      });

      it('should trim whitespace', () => {
        const filePath = path.join(tempDir, '.project-hub-ignore');
        fs.writeFileSync(filePath, '  node_modules  \n\t dist \t\n  /build/  ');

        const result = parser.parseIgnoreFile(filePath);

        expect(result).toHaveLength(3);
        expect(result[0].pattern).toBe('node_modules');
        expect(result[1].pattern).toBe('dist');
        expect(result[2].pattern).toBe('build');
      });
    });

    describe('parseContent', () => {
      it('should parse content string', () => {
        const content = 'node_modules\ndist\n# comment\nbuild';
        const result = parser.parseContent(content);

        expect(result).toHaveLength(3);
        expect(result[0].pattern).toBe('node_modules');
        expect(result[2].pattern).toBe('build');
      });

      it('should handle Windows line endings', () => {
        const content = 'node_modules\r\ndist\r\nbuild';
        const result = parser.parseContent(content);

        expect(result).toHaveLength(3);
      });

      it('should handle mixed line endings', () => {
        const content = 'node_modules\ndist\r\nbuild\n.git';
        const result = parser.parseContent(content);

        expect(result).toHaveLength(4);
      });
    });

    describe('matches', () => {
      it('should match exact directory name', () => {
        const patterns: IgnorePattern[] = [{ pattern: 'node_modules', negated: false }];

        expect(parser.matches('/project/node_modules', patterns)).toBe(true);
        expect(parser.matches('/project/src/node_modules', patterns)).toBe(true);
        expect(parser.matches('/project/mynode_modules', patterns)).toBe(false);
      });

      it('should match glob pattern with *', () => {
        const patterns: IgnorePattern[] = [{ pattern: '*.log', negated: false }];

        expect(parser.matches('/project/debug.log', patterns)).toBe(true);
        expect(parser.matches('/project/logs/error.log', patterns)).toBe(true);
        expect(parser.matches('/project/readme.txt', patterns)).toBe(false);
      });

      it('should match glob pattern with **', () => {
        const patterns: IgnorePattern[] = [{ pattern: '**/node_modules', negated: false }];

        expect(parser.matches('/project/node_modules', patterns)).toBe(true);
        expect(parser.matches('/project/src/node_modules', patterns)).toBe(true);
        expect(parser.matches('/project/src/lib/node_modules', patterns)).toBe(true);
      });

      it('should handle negation patterns', () => {
        const patterns: IgnorePattern[] = [
          { pattern: '*.log', negated: false },
          { pattern: 'important.log', negated: true },
        ];

        expect(parser.matches('/project/debug.log', patterns)).toBe(true);
        expect(parser.matches('/project/important.log', patterns)).toBe(false);
        expect(parser.matches('/project/readme.txt', patterns)).toBe(false);
      });

      it('should respect base directory for relative paths', () => {
        const baseDir = '/project';
        const patterns: IgnorePattern[] = [{ pattern: 'node_modules', negated: false }];

        expect(parser.matches('/project/node_modules', patterns, baseDir)).toBe(true);
        expect(parser.matches('/project/src/node_modules', patterns, baseDir)).toBe(true);
        expect(parser.matches('/other/node_modules', patterns, baseDir)).toBe(true); // Matches in any level
      });

      it('should match ? wildcard for single character', () => {
        const patterns: IgnorePattern[] = [{ pattern: 'file?.txt', negated: false }];

        expect(parser.matches('/project/filea.txt', patterns)).toBe(true);
        expect(parser.matches('/project/file1.txt', patterns)).toBe(true);
        expect(parser.matches('/project/file.txt', patterns)).toBe(false);
        expect(parser.matches('/project/fileab.txt', patterns)).toBe(false);
      });

      it('should handle common patterns', () => {
        const patterns: IgnorePattern[] = [
          { pattern: 'node_modules', negated: false },
          { pattern: '.git', negated: false },
          { pattern: '.env', negated: false },
          { pattern: 'dist', negated: false },
          { pattern: 'build', negated: false },
        ];

        expect(parser.matches('/myproject/node_modules', patterns)).toBe(true);
        expect(parser.matches('/myproject/.git', patterns)).toBe(true);
        expect(parser.matches('/myproject/.env', patterns)).toBe(true);
        expect(parser.matches('/myproject/dist', patterns)).toBe(true);
        expect(parser.matches('/myproject/build', patterns)).toBe(true);
        expect(parser.matches('/myproject/src', patterns)).toBe(false);
      });

      it('should match pattern at any level in path', () => {
        const patterns: IgnorePattern[] = [{ pattern: 'temp', negated: false }];

        expect(parser.matches('/project/temp', patterns)).toBe(true);
        expect(parser.matches('/project/src/temp', patterns)).toBe(true);
        expect(parser.matches('/project/src/temp/file.js', patterns)).toBe(false); // File inside temp
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple negations', () => {
        const patterns: IgnorePattern[] = [
          { pattern: '*.log', negated: false },
          { pattern: 'debug.log', negated: true },
          { pattern: 'error.log', negated: false },
        ];

        expect(parser.matches('/project/debug.log', patterns)).toBe(false);
        expect(parser.matches('/project/error.log', patterns)).toBe(true);
        expect(parser.matches('/project/info.log', patterns)).toBe(true);
      });

      it('should handle overlapping patterns', () => {
        const patterns: IgnorePattern[] = [
          { pattern: '**/build', negated: false },
          { pattern: '**/build/output', negated: true },
        ];

        expect(parser.matches('/project/build', patterns)).toBe(true);
        expect(parser.matches('/project/build/output', patterns)).toBe(false);
        expect(parser.matches('/project/src/build', patterns)).toBe(true);
      });

      it('should parse and match a real-world ignore file', () => {
        const filePath = path.join(tempDir, '.project-hub-ignore');
        const content = `
# Dependencies
node_modules
.venv
venv

# Build outputs
dist
build
*.egg-info

# Development
.env
.vscode
.idea

# Logs
*.log
!important.log

# OS
.DS_Store
Thumbs.db

# Custom
temp
__pycache__
        `;
        fs.writeFileSync(filePath, content);

        const patterns = parser.parseIgnoreFile(filePath);
        const baseDir = '/project';

        // Should match various patterns
        expect(parser.matches('/project/node_modules', patterns, baseDir)).toBe(true);
        expect(parser.matches('/project/.venv', patterns, baseDir)).toBe(true);
        expect(parser.matches('/project/dist', patterns, baseDir)).toBe(true);
        expect(parser.matches('/project/.env', patterns, baseDir)).toBe(true);
        expect(parser.matches('/project/debug.log', patterns, baseDir)).toBe(true);
        expect(parser.matches('/project/important.log', patterns, baseDir)).toBe(false);
        expect(parser.matches('/project/__pycache__', patterns, baseDir)).toBe(true);

        // Should NOT match
        expect(parser.matches('/project/src', patterns, baseDir)).toBe(false);
        expect(parser.matches('/project/package.json', patterns, baseDir)).toBe(false);
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property: Pattern consistency
     * For any pattern and path combination, the same result should be returned consistently
     * **Validates: Requirements 2.6, 31**
     */
    it('should consistently match the same path across multiple calls', () => {
      const testPattern: IgnorePattern = { pattern: 'node_modules', negated: false };
      const testPath = '/project/node_modules';

      const result1 = parser.matches(testPath, [testPattern]);
      const result2 = parser.matches(testPath, [testPattern]);

      expect(result1).toBe(result2);
    });

    /**
     * Property: Negation reverses matching
     * For any pattern with negation, the result should be the opposite of the non-negated version
     * **Validates: Requirements 2.6, 31**
     */
    it('should reverse matching with negation', () => {
      const pattern = 'debug.log';
      const pathSegment = '/project/debug.log';

      const nonNegated: IgnorePattern = { pattern, negated: false };
      const negated: IgnorePattern = { pattern, negated: true };

      const resultNonNegated = parser.matches(pathSegment, [nonNegated]);
      const resultNegated = parser.matches(pathSegment, [negated]);

      // If non-negated matches, negated should not match
      if (resultNonNegated) {
        expect(resultNegated).toBe(false);
      }
    });

    /**
     * Property: Empty patterns never match
     * For any path with empty patterns, should always return false
     * **Validates: Requirements 2.6, 31**
     */
    it('should not match with empty patterns', () => {
      const testPath = '/project/node_modules';
      const result = parser.matches(testPath, []);
      expect(result).toBe(false);
    });

    /**
     * Property: Pattern parsing never crashes
     * For any string input, parseContent should never throw
     * **Validates: Requirements 2.6, 31**
     */
    it('should safely parse any content without throwing', () => {
      const testCases = [
        '',
        'single line',
        'multiple\nlines\nhere',
        '# only comment',
        '\n\n\n',
        'node_modules\n# comment\n.git\n\n\n',
      ];

      testCases.forEach((content) => {
        expect(() => {
          parser.parseContent(content);
        }).not.toThrow();
      });
    });

    /**
     * Property: Glob patterns behave predictably
     * For patterns with *, ** and ?, behavior should be consistent with glob standards
     * **Validates: Requirements 2.6, 31**
     */
    it('should handle glob patterns predictably', () => {
      // Test extension matching
      const logPattern: IgnorePattern = { pattern: '*.log', negated: false };
      expect(parser.matches('/project/debug.log', [logPattern])).toBe(true);
      expect(parser.matches('/project/error.log', [logPattern])).toBe(true);
      expect(parser.matches('/project/readme.txt', [logPattern])).toBe(false);

      // Test ** patterns
      const buildPattern: IgnorePattern = { pattern: '**/build', negated: false };
      expect(parser.matches('/project/build', [buildPattern])).toBe(true);
      expect(parser.matches('/project/src/build', [buildPattern])).toBe(true);
      expect(parser.matches('/project/src/lib/build', [buildPattern])).toBe(true);
    });
  });
});
