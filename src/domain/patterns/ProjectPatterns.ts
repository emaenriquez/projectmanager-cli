/**
 * Interfaz para un patrón de configuración de proyecto
 */
export interface ProjectPattern {
  filename: string;
  language: string;
  category: 'runtime' | 'framework' | 'build-tool' | 'dependency-manager' | 'config';
}

/**
 * Registro de patrones de configuración para detectar proyectos
 * Soporta: Node.js, Python, Rust, Go, Java, PHP, Ruby
 */
export const PROJECT_PATTERNS: ProjectPattern[] = [
  // Node.js / JavaScript / TypeScript
  {
    filename: 'package.json',
    language: 'Node.js',
    category: 'runtime',
  },
  {
    filename: 'package-lock.json',
    language: 'Node.js',
    category: 'dependency-manager',
  },
  {
    filename: 'yarn.lock',
    language: 'Node.js',
    category: 'dependency-manager',
  },
  {
    filename: 'pnpm-lock.yaml',
    language: 'Node.js',
    category: 'dependency-manager',
  },
  {
    filename: 'tsconfig.json',
    language: 'TypeScript',
    category: 'config',
  },

  // Python
  {
    filename: 'requirements.txt',
    language: 'Python',
    category: 'dependency-manager',
  },
  {
    filename: 'pyproject.toml',
    language: 'Python',
    category: 'config',
  },
  {
    filename: 'setup.py',
    language: 'Python',
    category: 'build-tool',
  },
  {
    filename: 'setup.cfg',
    language: 'Python',
    category: 'config',
  },
  {
    filename: 'Pipfile',
    language: 'Python',
    category: 'dependency-manager',
  },
  {
    filename: 'Pipfile.lock',
    language: 'Python',
    category: 'dependency-manager',
  },
  {
    filename: 'poetry.lock',
    language: 'Python',
    category: 'dependency-manager',
  },

  // Rust
  {
    filename: 'Cargo.toml',
    language: 'Rust',
    category: 'config',
  },
  {
    filename: 'Cargo.lock',
    language: 'Rust',
    category: 'dependency-manager',
  },

  // Go
  {
    filename: 'go.mod',
    language: 'Go',
    category: 'config',
  },
  {
    filename: 'go.sum',
    language: 'Go',
    category: 'dependency-manager',
  },

  // Java
  {
    filename: 'pom.xml',
    language: 'Java',
    category: 'build-tool',
  },
  {
    filename: 'build.gradle',
    language: 'Java',
    category: 'build-tool',
  },
  {
    filename: 'build.gradle.kts',
    language: 'Java',
    category: 'build-tool',
  },

  // PHP
  {
    filename: 'composer.json',
    language: 'PHP',
    category: 'config',
  },
  {
    filename: 'composer.lock',
    language: 'PHP',
    category: 'dependency-manager',
  },

  // Ruby
  {
    filename: 'Gemfile',
    language: 'Ruby',
    category: 'dependency-manager',
  },
  {
    filename: 'Gemfile.lock',
    language: 'Ruby',
    category: 'dependency-manager',
  },

  // Generic
  {
    filename: 'Makefile',
    language: 'Generic',
    category: 'build-tool',
  },
  {
    filename: 'CMakeLists.txt',
    language: 'Generic',
    category: 'build-tool',
  },
  {
    filename: '.editorconfig',
    language: 'Generic',
    category: 'config',
  },
];

/**
 * Obtiene todos los patrones de configuración disponibles
 * @returns Array de todos los patrones
 */
export function getAllPatterns(): ProjectPattern[] {
  return [...PROJECT_PATTERNS];
}

/**
 * Obtiene patrones para un lenguaje específico
 * @param language Lenguaje a filtrar
 * @returns Patrones que coinciden con el lenguaje
 */
export function getPatternsByLanguage(language: string): ProjectPattern[] {
  return PROJECT_PATTERNS.filter((p) => p.language === language);
}

/**
 * Obtiene patrones por categoría
 * @param category Categoría a filtrar
 * @returns Patrones que coinciden con la categoría
 */
export function getPatternsByCategory(
  category: 'runtime' | 'framework' | 'build-tool' | 'dependency-manager' | 'config'
): ProjectPattern[] {
  return PROJECT_PATTERNS.filter((p) => p.category === category);
}

/**
 * Obtiene el patrón para un nombre de archivo específico
 * @param filename Nombre del archivo
 * @returns Patrón correspondiente o undefined
 */
export function getPatternByFilename(filename: string): ProjectPattern | undefined {
  return PROJECT_PATTERNS.find((p) => p.filename === filename);
}

/**
 * Obtiene todos los lenguajes únicos soportados
 * @returns Array de lenguajes únicos
 */
export function getSupportedLanguages(): string[] {
  const languages = new Set(PROJECT_PATTERNS.map((p) => p.language));
  return Array.from(languages).sort();
}

/**
 * Obtiene todos los nombres de archivo que se usan para detectar proyectos
 * @returns Array de nombres de archivo
 */
export function getAllConfigFilenames(): string[] {
  return PROJECT_PATTERNS.map((p) => p.filename).sort();
}
