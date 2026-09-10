import {
  getAllPatterns,
  getPatternsByLanguage,
  getPatternsByCategory,
  getPatternByFilename,
  getSupportedLanguages,
  getAllConfigFilenames,
  PROJECT_PATTERNS,
  ProjectPattern,
} from './ProjectPatterns';

describe('ProjectPatterns', () => {
  describe('getAllPatterns', () => {
    it('should return all patterns', () => {
      const patterns = getAllPatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return patterns with required properties', () => {
      const patterns = getAllPatterns();

      for (const pattern of patterns) {
        expect(pattern).toHaveProperty('filename');
        expect(pattern).toHaveProperty('language');
        expect(pattern).toHaveProperty('category');

        expect(typeof pattern.filename).toBe('string');
        expect(typeof pattern.language).toBe('string');
        expect(['runtime', 'framework', 'build-tool', 'dependency-manager', 'config']).toContain(
          pattern.category
        );
      }
    });

    it('should return a copy, not the original array', () => {
      const patterns1 = getAllPatterns();
      const patterns2 = getAllPatterns();

      expect(patterns1).not.toBe(patterns2);
      expect(patterns1).toEqual(patterns2);
    });
  });

  describe('getPatternsByLanguage', () => {
    it('should return patterns for Node.js', () => {
      const patterns = getPatternsByLanguage('Node.js');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'Node.js')).toBe(true);
      expect(patterns.some((p) => p.filename === 'package.json')).toBe(true);
    });

    it('should return patterns for Python', () => {
      const patterns = getPatternsByLanguage('Python');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'Python')).toBe(true);
      expect(patterns.some((p) => p.filename === 'pyproject.toml' || p.filename === 'requirements.txt')).toBe(
        true
      );
    });

    it('should return patterns for Rust', () => {
      const patterns = getPatternsByLanguage('Rust');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'Rust')).toBe(true);
      expect(patterns.some((p) => p.filename === 'Cargo.toml')).toBe(true);
    });

    it('should return patterns for Go', () => {
      const patterns = getPatternsByLanguage('Go');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'Go')).toBe(true);
      expect(patterns.some((p) => p.filename === 'go.mod')).toBe(true);
    });

    it('should return patterns for Java', () => {
      const patterns = getPatternsByLanguage('Java');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'Java')).toBe(true);
      expect(
        patterns.some((p) => p.filename === 'pom.xml' || p.filename === 'build.gradle')
      ).toBe(true);
    });

    it('should return patterns for PHP', () => {
      const patterns = getPatternsByLanguage('PHP');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'PHP')).toBe(true);
      expect(patterns.some((p) => p.filename === 'composer.json')).toBe(true);
    });

    it('should return patterns for Ruby', () => {
      const patterns = getPatternsByLanguage('Ruby');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.language === 'Ruby')).toBe(true);
      expect(patterns.some((p) => p.filename === 'Gemfile')).toBe(true);
    });

    it('should return empty array for unknown language', () => {
      const patterns = getPatternsByLanguage('UnknownLanguage');

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBe(0);
    });
  });

  describe('getPatternsByCategory', () => {
    it('should return patterns for runtime category', () => {
      const patterns = getPatternsByCategory('runtime');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.category === 'runtime')).toBe(true);
    });

    it('should return patterns for dependency-manager category', () => {
      const patterns = getPatternsByCategory('dependency-manager');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.category === 'dependency-manager')).toBe(true);
      expect(
        patterns.some((p) => ['package-lock.json', 'requirements.txt', 'Cargo.lock'].includes(p.filename))
      ).toBe(true);
    });

    it('should return patterns for build-tool category', () => {
      const patterns = getPatternsByCategory('build-tool');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.category === 'build-tool')).toBe(true);
    });

    it('should return patterns for config category', () => {
      const patterns = getPatternsByCategory('config');

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.category === 'config')).toBe(true);
    });
  });

  describe('getPatternByFilename', () => {
    it('should return pattern for package.json', () => {
      const pattern = getPatternByFilename('package.json');

      expect(pattern).toBeDefined();
      expect(pattern?.filename).toBe('package.json');
      expect(pattern?.language).toBe('Node.js');
    });

    it('should return pattern for pyproject.toml', () => {
      const pattern = getPatternByFilename('pyproject.toml');

      expect(pattern).toBeDefined();
      expect(pattern?.filename).toBe('pyproject.toml');
      expect(pattern?.language).toBe('Python');
    });

    it('should return pattern for Cargo.toml', () => {
      const pattern = getPatternByFilename('Cargo.toml');

      expect(pattern).toBeDefined();
      expect(pattern?.filename).toBe('Cargo.toml');
      expect(pattern?.language).toBe('Rust');
    });

    it('should return undefined for unknown filename', () => {
      const pattern = getPatternByFilename('unknown.txt');

      expect(pattern).toBeUndefined();
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of unique languages', () => {
      const languages = getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);

      // Verificar que están únicos
      const uniqueLanguages = new Set(languages);
      expect(uniqueLanguages.size).toBe(languages.length);
    });

    it('should include main languages', () => {
      const languages = getSupportedLanguages();

      expect(languages).toContain('Node.js');
      expect(languages).toContain('Python');
      expect(languages).toContain('Rust');
      expect(languages).toContain('Go');
      expect(languages).toContain('Java');
      expect(languages).toContain('PHP');
      expect(languages).toContain('Ruby');
    });

    it('should be sorted alphabetically', () => {
      const languages = getSupportedLanguages();

      expect(languages).toEqual([...languages].sort());
    });
  });

  describe('getAllConfigFilenames', () => {
    it('should return array of all config filenames', () => {
      const filenames = getAllConfigFilenames();

      expect(Array.isArray(filenames)).toBe(true);
      expect(filenames.length).toBeGreaterThan(0);
    });

    it('should include main configuration files', () => {
      const filenames = getAllConfigFilenames();

      expect(filenames).toContain('package.json');
      expect(filenames).toContain('pyproject.toml');
      expect(filenames).toContain('Cargo.toml');
      expect(filenames).toContain('go.mod');
      expect(filenames).toContain('pom.xml');
      expect(filenames).toContain('composer.json');
      expect(filenames).toContain('Gemfile');
    });

    it('should be sorted alphabetically', () => {
      const filenames = getAllConfigFilenames();

      expect(filenames).toEqual([...filenames].sort());
    });

    it('should not contain duplicates', () => {
      const filenames = getAllConfigFilenames();
      const uniqueFilenames = new Set(filenames);

      expect(uniqueFilenames.size).toBe(filenames.length);
    });
  });

  describe('Pattern consistency', () => {
    it('should have unique filenames in PROJECT_PATTERNS', () => {
      const filenames = PROJECT_PATTERNS.map((p) => p.filename);
      const uniqueFilenames = new Set(filenames);

      expect(uniqueFilenames.size).toBe(filenames.length);
    });

    it('should have valid categories for all patterns', () => {
      const validCategories = ['runtime', 'framework', 'build-tool', 'dependency-manager', 'config'];

      for (const pattern of PROJECT_PATTERNS) {
        expect(validCategories).toContain(pattern.category);
      }
    });

    it('should have non-empty filenames', () => {
      for (const pattern of PROJECT_PATTERNS) {
        expect(pattern.filename).not.toBe('');
        expect(pattern.filename.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty languages', () => {
      for (const pattern of PROJECT_PATTERNS) {
        expect(pattern.language).not.toBe('');
        expect(pattern.language.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration', () => {
    it('should be able to get all patterns and access their properties', () => {
      const patterns = getAllPatterns();

      for (const pattern of patterns) {
        const byFilename = getPatternByFilename(pattern.filename);
        expect(byFilename).toEqual(pattern);

        const byLanguage = getPatternsByLanguage(pattern.language);
        expect(byLanguage.some((p) => p.filename === pattern.filename)).toBe(true);

        const byCategory = getPatternsByCategory(pattern.category);
        expect(byCategory.some((p) => p.filename === pattern.filename)).toBe(true);
      }
    });
  });
});
