import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a detected technology in a project
 */
export interface DetectedTechnology {
  name: string;
  version?: string;
  category: 'language' | 'framework' | 'tool';
}

/**
 * TechnologyDetector detects programming languages, frameworks, and tools
 * used in a project by analyzing configuration files
 */
export class TechnologyDetector {
  /**
   * Detect all technologies in a project
   * @param projectPath Path to the project directory
   * @returns Array of detected technologies
   */
  public detect(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];

    try {
      // Check Node.js/JavaScript/TypeScript
      const packageJsonTechs = this.detectFromPackageJson(projectPath);
      technologies.push(...packageJsonTechs);

      // Check Python
      const pythonTechs = this.detectFromRequirements(projectPath);
      technologies.push(...pythonTechs);

      // Check Ruby
      const rubyTechs = this.detectFromGemfile(projectPath);
      technologies.push(...rubyTechs);

      // Check Rust
      const rustTechs = this.detectFromCargoToml(projectPath);
      technologies.push(...rustTechs);

      // Check Go
      const goTechs = this.detectFromGoMod(projectPath);
      technologies.push(...goTechs);

      // Check Java
      const javaTechs = this.detectFromPom(projectPath);
      technologies.push(...javaTechs);

      // Check PHP
      const phpTechs = this.detectFromComposerJson(projectPath);
      technologies.push(...phpTechs);
    } catch (error) {
      // Log error but don't fail - continue with partial detection
      console.error(`Error detecting technologies in ${projectPath}:`, error);
    }

    return technologies;
  }

  /**
   * Detect Node.js/TypeScript/JavaScript from package.json
   */
  public detectFromPackageJson(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return technologies;
    }

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = this.parseJSON(content);

      if (!packageJson) {
        return technologies;
      }

      // Detect Node.js/TypeScript
      const nodeVersion = packageJson.engines?.node;
      const resolvedNodeVersion = nodeVersion
        ? this.extractVersion(nodeVersion)
        : this.extractNodeVersionFromLockFile(projectPath);
      
      technologies.push({
        name: 'Node.js',
        version: resolvedNodeVersion,
        category: 'language'
      });

      // Check for TypeScript
      if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
        const tsVersion = packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript;
        technologies.push({
          name: 'TypeScript',
          version: this.extractVersion(tsVersion),
          category: 'language'
        });
      }

      // Detect frameworks
      const frameworks = this.detectFrameworksFromDependencies(packageJson);
      technologies.push(...frameworks);
    } catch (error) {
      console.error(`Error parsing package.json: ${error}`);
    }

    return technologies;
  }

  /**
   * Detect Python from requirements.txt or pyproject.toml
   */
  public detectFromRequirements(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];

    // Check requirements.txt
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      const pythonVersion = this.extractPythonVersionFromLockFile(projectPath);
      technologies.push({
        name: 'Python',
        version: pythonVersion,
        category: 'language'
      });
      
      // Detect Python frameworks from requirements.txt
      try {
        const content = fs.readFileSync(requirementsPath, 'utf-8');
        this.detectPythonFrameworks(content).forEach(framework => {
          technologies.push(framework);
        });
      } catch (error) {
        console.error(`Error reading requirements.txt: ${error}`);
      }
      
      return technologies;
    }

    // Check pyproject.toml
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        if (content.includes('python')) {
          // Try to extract python version requirement
          const pythonMatch = content.match(/python\s*=\s*['"]([\d.x*]+)['"]/);
          const pythonVersion = pythonMatch ? pythonMatch[1].replace(/[x*]/g, '') : this.extractPythonVersionFromLockFile(projectPath);
          
          technologies.push({
            name: 'Python',
            version: pythonVersion,
            category: 'language'
          });
          
          // Detect Python frameworks from pyproject.toml
          this.detectPythonFrameworks(content).forEach(framework => {
            technologies.push(framework);
          });
        }
      } catch (error) {
        console.error(`Error reading pyproject.toml: ${error}`);
      }
    }

    return technologies;
  }

  /**
   * Detect Rust from Cargo.toml
   */
  public detectFromCargoToml(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');

    if (!fs.existsSync(cargoTomlPath)) {
      return technologies;
    }

    try {
      const content = fs.readFileSync(cargoTomlPath, 'utf-8');
      if (content.includes('[package]')) {
        technologies.push({
          name: 'Rust',
          category: 'language'
        });
      }
    } catch (error) {
      console.error(`Error reading Cargo.toml: ${error}`);
    }

    return technologies;
  }

  /**
   * Detect Go from go.mod
   */
  public detectFromGoMod(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];
    const goModPath = path.join(projectPath, 'go.mod');

    if (!fs.existsSync(goModPath)) {
      return technologies;
    }

    try {
      const content = fs.readFileSync(goModPath, 'utf-8');
      const versionMatch = content.match(/^go\s+([\d.]+)/m);
      technologies.push({
        name: 'Go',
        version: versionMatch ? versionMatch[1] : undefined,
        category: 'language'
      });
    } catch (error) {
      console.error(`Error reading go.mod: ${error}`);
    }

    return technologies;
  }

  /**
   * Detect Java from pom.xml or build.gradle
   */
  public detectFromPom(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];

    // Check pom.xml
    const pomPath = path.join(projectPath, 'pom.xml');
    if (fs.existsSync(pomPath)) {
      try {
        const content = fs.readFileSync(pomPath, 'utf-8');
        if (content.includes('<project')) {
          // Detect Java version from maven version
          const sourceMatch = content.match(/<source>([\d.]+)<\/source>/);
          technologies.push({
            name: 'Java',
            version: sourceMatch ? sourceMatch[1] : undefined,
            category: 'language'
          });

          // Detect Maven
          technologies.push({
            name: 'Maven',
            category: 'tool'
          });

          // Detect Spring if present
          if (content.includes('spring-boot') || content.includes('spring-framework')) {
            technologies.push({
              name: 'Spring',
              category: 'framework'
            });
          }
        }
      } catch (error) {
        console.error(`Error reading pom.xml: ${error}`);
      }
      return technologies;
    }

    // Check build.gradle
    const gradlePath = path.join(projectPath, 'build.gradle');
    if (fs.existsSync(gradlePath)) {
      try {
        const content = fs.readFileSync(gradlePath, 'utf-8');
        if (content.includes('plugins')) {
          // Try to extract Java version from gradle config
          const javaVersion = this.extractJavaVersionFromBuildFiles(projectPath);
          
          technologies.push({
            name: 'Java',
            version: javaVersion,
            category: 'language'
          });

          // Detect Gradle
          technologies.push({
            name: 'Gradle',
            category: 'tool'
          });

          // Detect Spring if present
          if (content.includes('spring-boot') || content.includes('spring')) {
            technologies.push({
              name: 'Spring',
              category: 'framework'
            });
          }
        }
      } catch (error) {
        console.error(`Error reading build.gradle: ${error}`);
      }
    }

    return technologies;
  }

  /**
   * Detect PHP from composer.json
   */
  public detectFromComposerJson(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];
    const composerJsonPath = path.join(projectPath, 'composer.json');

    if (!fs.existsSync(composerJsonPath)) {
      return technologies;
    }

    try {
      const content = fs.readFileSync(composerJsonPath, 'utf-8');
      const composerJson = this.parseJSON(content);

      if (!composerJson) {
        return technologies;
      }

      // Detect PHP version from require
      const phpVersion = composerJson.require?.php;
      technologies.push({
        name: 'PHP',
        version: phpVersion ? this.extractVersion(phpVersion) : undefined,
        category: 'language'
      });

      // Detect frameworks
      if (composerJson.require) {
        if (composerJson.require['laravel/framework']) {
          technologies.push({
            name: 'Laravel',
            category: 'framework'
          });
        }
        if (composerJson.require['symfony/console']) {
          technologies.push({
            name: 'Symfony',
            category: 'framework'
          });
        }
      }
    } catch (error) {
      console.error(`Error parsing composer.json: ${error}`);
    }

    return technologies;
  }

  /**
   * Detect Ruby from Gemfile
   */
  public detectFromGemfile(projectPath: string): DetectedTechnology[] {
    const technologies: DetectedTechnology[] = [];
    const gemfilePath = path.join(projectPath, 'Gemfile');

    if (!fs.existsSync(gemfilePath)) {
      return technologies;
    }

    try {
      const content = fs.readFileSync(gemfilePath, 'utf-8');
      
      // Detect Ruby
      technologies.push({
        name: 'Ruby',
        category: 'language'
      });

      // Detect Ruby frameworks
      const rubyFrameworks: Record<string, string> = {
        'rails': 'Rails',
        'sinatra': 'Sinatra',
        'hanami': 'Hanami',
        'rack': 'Rack',
        'grape': 'Grape',
        'padrino': 'Padrino'
      };

      Object.keys(rubyFrameworks).forEach(framework => {
        const regex = new RegExp(`gem\\s+['"]${framework}['"]`, 'i');
        if (regex.test(content)) {
          technologies.push({
            name: rubyFrameworks[framework],
            category: 'framework'
          });
        }
      });
    } catch (error) {
      console.error(`Error reading Gemfile: ${error}`);
    }

    return technologies;
  }

  /**
   * Detect Python frameworks from requirements content
   */
  private detectPythonFrameworks(content: string): DetectedTechnology[] {
    const frameworks: DetectedTechnology[] = [];

    const pythonFrameworks: Record<string, string> = {
      'django': 'Django',
      'flask': 'Flask',
      'fastapi': 'FastAPI',
      'starlette': 'Starlette',
      'pyramid': 'Pyramid',
      'tornado': 'Tornado',
      'aiohttp': 'aiohttp',
      'sanic': 'Sanic',
      'bottle': 'Bottle',
      'cherrypy': 'CherryPy',
      'sqlalchemy': 'SQLAlchemy',
      'pydantic': 'Pydantic',
      'celery': 'Celery'
    };

    Object.keys(pythonFrameworks).forEach(framework => {
      // Match framework in requirements (case-insensitive)
      const regex = new RegExp(`\\b${framework}\\b`, 'i');
      if (regex.test(content)) {
        frameworks.push({
          name: pythonFrameworks[framework],
          category: 'framework'
        });
      }
    });

    return frameworks;
  }

  /**
   * Detect frameworks from npm dependencies
   */
  private detectFrameworksFromDependencies(packageJson: any): DetectedTechnology[] {
    const frameworks: DetectedTechnology[] = [];
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Comprehensive framework detection map
    const frameworkMap: Record<string, string> = {
      // Frontend Frameworks
      'react': 'React',
      'react-dom': 'React',
      'vue': 'Vue',
      '@vue/core': 'Vue',
      'next': 'Next.js',
      'nuxt': 'Nuxt',
      '@nuxt/core': 'Nuxt',
      '@angular/core': 'Angular',
      'angular': 'Angular',
      'svelte': 'Svelte',
      'astro': 'Astro',
      'remix': 'Remix',
      
      // Backend Frameworks
      'express': 'Express',
      'koa': 'Koa',
      'hapi': 'Hapi',
      'fastify': 'Fastify',
      '@nestjs/core': 'NestJS',
      '@nestjs/common': 'NestJS',
      'nestjs-core': 'NestJS',
      'adonis': 'AdonisJS',
      'adonisjs': 'AdonisJS',
      'loopback': 'LoopBack',
      'strapi': 'Strapi',
      'blitz': 'Blitz',
      
      // Full-stack
      'sveltekit': 'SvelteKit',
      
      // Utilities & Libraries
      'webpack': 'Webpack',
      'vite': 'Vite',
      'rollup': 'Rollup',
      'parcel': 'Parcel',
      'babel': 'Babel',
      'typescript': 'TypeScript',
      'jest': 'Jest',
      'vitest': 'Vitest',
      'mocha': 'Mocha',
      'jasmine': 'Jasmine'
    };

    Object.keys(frameworkMap).forEach(dep => {
      if (allDeps[dep]) {
        frameworks.push({
          name: frameworkMap[dep],
          version: this.extractVersion(allDeps[dep]),
          category: 'framework'
        });
      }
    });

    return frameworks;
  }

  /**
   * Parse JSON content
   */
  private parseJSON(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to parse JSON: ${error}`);
      return null;
    }
  }

  /**
   * Extract Node.js version from lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)
   */
  private extractNodeVersionFromLockFile(projectPath: string): string | undefined {
    // Try package-lock.json first
    const packageLockPath = path.join(projectPath, 'package-lock.json');
    if (fs.existsSync(packageLockPath)) {
      try {
        const content = fs.readFileSync(packageLockPath, 'utf-8');
        const packageLock = this.parseJSON(content);
        if (packageLock?.lockfileVersion && packageLock?.packages?.['']?.engines?.node) {
          return this.extractVersion(packageLock.packages[''].engines.node);
        }
      } catch (error) {
        console.error(`Error reading package-lock.json: ${error}`);
      }
    }

    // Try yarn.lock (simple parsing)
    const yarnLockPath = path.join(projectPath, 'yarn.lock');
    if (fs.existsSync(yarnLockPath)) {
      try {
        const content = fs.readFileSync(yarnLockPath, 'utf-8');
        // Look for node version in yarn.lock
        const nodeMatch = content.match(/# yarn\.lock file.*?\nnode (\d+\.\d+\.\d+)/s);
        if (nodeMatch) {
          return nodeMatch[1];
        }
      } catch (error) {
        console.error(`Error reading yarn.lock: ${error}`);
      }
    }

    // Try pnpm-lock.yaml (simple parsing)
    const pnpmLockPath = path.join(projectPath, 'pnpm-lock.yaml');
    if (fs.existsSync(pnpmLockPath)) {
      try {
        const content = fs.readFileSync(pnpmLockPath, 'utf-8');
        // Look for node version in pnpm-lock.yaml
        const nodeMatch = content.match(/engines:\s*node:\s*(['"])?(\d+\.\d+\.\d+)\1?/);
        if (nodeMatch) {
          return nodeMatch[2];
        }
      } catch (error) {
        console.error(`Error reading pnpm-lock.yaml: ${error}`);
      }
    }

    return undefined;
  }

  /**
   * Extract Python version from lock files or virtual environment
   */
  private extractPythonVersionFromLockFile(projectPath: string): string | undefined {
    // Try poetry.lock
    const poetryLockPath = path.join(projectPath, 'poetry.lock');
    if (fs.existsSync(poetryLockPath)) {
      try {
        const content = fs.readFileSync(poetryLockPath, 'utf-8');
        // Look for python version in metadata
        const pythonMatch = content.match(/python-versions\s*=\s*"([^"]+)"/);
        if (pythonMatch) {
          // Extract first version mentioned
          const versionMatch = pythonMatch[1].match(/(\d+\.\d+)/);
          return versionMatch ? versionMatch[1] : undefined;
        }
      } catch (error) {
        console.error(`Error reading poetry.lock: ${error}`);
      }
    }

    // Try Pipfile.lock
    const pipfileLockPath = path.join(projectPath, 'Pipfile.lock');
    if (fs.existsSync(pipfileLockPath)) {
      try {
        const content = fs.readFileSync(pipfileLockPath, 'utf-8');
        const pipfileLock = this.parseJSON(content);
        if (pipfileLock?._meta?.requires?.python_version) {
          return pipfileLock._meta.requires.python_version;
        }
      } catch (error) {
        console.error(`Error reading Pipfile.lock: ${error}`);
      }
    }

    // Try pdm.lock
    const pdmLockPath = path.join(projectPath, 'pdm.lock');
    if (fs.existsSync(pdmLockPath)) {
      try {
        const content = fs.readFileSync(pdmLockPath, 'utf-8');
        // Look for python version in metadata
        const pythonMatch = content.match(/requires-python\s*=\s*"([^"]+)"/);
        if (pythonMatch) {
          const versionMatch = pythonMatch[1].match(/(\d+\.\d+)/);
          return versionMatch ? versionMatch[1] : undefined;
        }
      } catch (error) {
        console.error(`Error reading pdm.lock: ${error}`);
      }
    }

    return undefined;
  }

  /**
   * Extract Java version from Maven or Gradle build files
   */
  private extractJavaVersionFromBuildFiles(projectPath: string): string | undefined {
    // Check gradle.properties or gradle-wrapper.properties
    const gradlePropsPath = path.join(projectPath, 'gradle.properties');
    if (fs.existsSync(gradlePropsPath)) {
      try {
        const content = fs.readFileSync(gradlePropsPath, 'utf-8');
        const javaMatch = content.match(/org\.gradle\.java\.home=.*?java-(\d+)/);
        if (javaMatch) {
          return javaMatch[1];
        }
      } catch (error) {
        console.error(`Error reading gradle.properties: ${error}`);
      }
    }

    // Check gradle-wrapper.properties
    const wrapperPropsPath = path.join(projectPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');
    if (fs.existsSync(wrapperPropsPath)) {
      try {
        const content = fs.readFileSync(wrapperPropsPath, 'utf-8');
        const javaMatch = content.match(/org\.gradle\.java\.home=.*?java-(\d+)/);
        if (javaMatch) {
          return javaMatch[1];
        }
      } catch (error) {
        console.error(`Error reading gradle-wrapper.properties: ${error}`);
      }
    }

    return undefined;
  }

  /**
   * Extract version from version string
   * Handles common formats like "^1.0.0", "~1.0.0", "1.0.0", etc.
   */
  private extractVersion(versionString: string): string | undefined {
    if (!versionString) {
      return undefined;
    }

    // Remove common version specifiers
    const cleaned = versionString.replace(/^[\^~>=<]*/, '').trim();
    
    // Extract first version number
    const match = cleaned.match(/^([\d.]+)/);
    return match ? match[1] : undefined;
  }
}
