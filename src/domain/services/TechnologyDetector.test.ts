import { TechnologyDetector } from './TechnologyDetector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TechnologyDetector', () => {
  let detector: TechnologyDetector;
  let testDir: string;

  beforeEach(() => {
    detector = new TechnologyDetector();
    testDir = path.join(os.tmpdir(), `test-project-${Date.now()}`);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectFromPackageJson', () => {
    it('should detect Node.js from package.json', () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        engines: { node: '18.0.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Node.js',
          category: 'language'
        })
      );
    });

    it('should detect TypeScript from dependencies', () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          typescript: '^5.0.0'
        }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'TypeScript',
          category: 'language'
        })
      );
    });

    it('should detect React framework', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.2.0'
        }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'React',
          category: 'framework'
        })
      );
    });

    it('should detect Next.js framework', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {
          next: '^14.0.0'
        }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Next.js',
          category: 'framework'
        })
      );
    });

    it('should return empty array if package.json not found', () => {
      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toEqual([]);
    });

    it('should handle malformed package.json gracefully', () => {
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        'invalid json {'
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toEqual([]);
    });
  });

  describe('detectFromRequirements', () => {
    it('should detect Python from requirements.txt', () => {
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'django==3.0.0\nrequests==2.25.0'
      );

      const techs = detector.detectFromRequirements(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Python',
          category: 'language'
        })
      );
    });

    it('should detect Python from pyproject.toml', () => {
      fs.writeFileSync(
        path.join(testDir, 'pyproject.toml'),
        '[project]\nname = "test"\nrequires-python = ">=3.8"'
      );

      const techs = detector.detectFromRequirements(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Python',
          category: 'language'
        })
      );
    });

    it('should return empty array if no Python files found', () => {
      const techs = detector.detectFromRequirements(testDir);

      expect(techs).toEqual([]);
    });
  });

  describe('detectFromCargoToml', () => {
    it('should detect Rust from Cargo.toml', () => {
      const cargoToml = `[package]
name = "test-project"
version = "0.1.0"
edition = "2021"`;
      fs.writeFileSync(path.join(testDir, 'Cargo.toml'), cargoToml);

      const techs = detector.detectFromCargoToml(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Rust',
          category: 'language'
        })
      );
    });

    it('should return empty array if Cargo.toml not found', () => {
      const techs = detector.detectFromCargoToml(testDir);

      expect(techs).toEqual([]);
    });
  });

  describe('detectFromGoMod', () => {
    it('should detect Go from go.mod', () => {
      fs.writeFileSync(
        path.join(testDir, 'go.mod'),
        'module example.com/hello\ngo 1.21'
      );

      const techs = detector.detectFromGoMod(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Go',
          version: '1.21',
          category: 'language'
        })
      );
    });

    it('should return empty array if go.mod not found', () => {
      const techs = detector.detectFromGoMod(testDir);

      expect(techs).toEqual([]);
    });
  });

  describe('detectFromPom', () => {
    it('should detect Java from pom.xml', () => {
      const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>test</artifactId>
  <version>1.0-SNAPSHOT</version>
  <properties>
    <maven.compiler.source>11</maven.compiler.source>
    <source>11</source>
  </properties>
</project>`;
      fs.writeFileSync(path.join(testDir, 'pom.xml'), pomXml);

      const techs = detector.detectFromPom(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Java',
          version: '11',
          category: 'language'
        })
      );
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Maven',
          category: 'tool'
        })
      );
    });

    it('should detect Spring framework from pom.xml', () => {
      const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter</artifactId>
    </dependency>
  </dependencies>
</project>`;
      fs.writeFileSync(path.join(testDir, 'pom.xml'), pomXml);

      const techs = detector.detectFromPom(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Spring',
          category: 'framework'
        })
      );
    });

    it('should detect Java from build.gradle', () => {
      fs.writeFileSync(
        path.join(testDir, 'build.gradle'),
        'plugins {\n  id "java"\n}'
      );

      const techs = detector.detectFromPom(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Java',
          category: 'language'
        })
      );
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Gradle',
          category: 'tool'
        })
      );
    });

    it('should return empty array if neither pom.xml nor build.gradle found', () => {
      const techs = detector.detectFromPom(testDir);

      expect(techs).toEqual([]);
    });
  });

  describe('detectFromComposerJson', () => {
    it('should detect PHP from composer.json', () => {
      const composerJson = {
        name: 'test/project',
        require: {
          php: '^7.4'
        }
      };
      fs.writeFileSync(
        path.join(testDir, 'composer.json'),
        JSON.stringify(composerJson)
      );

      const techs = detector.detectFromComposerJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'PHP',
          version: '7.4',
          category: 'language'
        })
      );
    });

    it('should detect Laravel framework', () => {
      const composerJson = {
        name: 'test/project',
        require: {
          php: '^7.4',
          'laravel/framework': '^9.0'
        }
      };
      fs.writeFileSync(
        path.join(testDir, 'composer.json'),
        JSON.stringify(composerJson)
      );

      const techs = detector.detectFromComposerJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Laravel',
          category: 'framework'
        })
      );
    });

    it('should return empty array if composer.json not found', () => {
      const techs = detector.detectFromComposerJson(testDir);

      expect(techs).toEqual([]);
    });
  });

  describe('detect', () => {
    it('should detect multiple technologies in a project', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: { react: '^18.0.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );
      fs.writeFileSync(
        path.join(testDir, 'requirements.txt'),
        'django==3.0.0'
      );

      const techs = detector.detect(testDir);

      expect(techs.length).toBeGreaterThan(0);
      expect(techs).toContainEqual(
        expect.objectContaining({ name: 'Node.js' })
      );
      expect(techs).toContainEqual(
        expect.objectContaining({ name: 'React' })
      );
      expect(techs).toContainEqual(
        expect.objectContaining({ name: 'Python' })
      );
    });

    it('should handle projects with no detected technologies', () => {
      const techs = detector.detect(testDir);

      expect(techs).toEqual([]);
    });

    it('should handle errors gracefully during detection', () => {
      // Create package.json with invalid JSON
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        'not valid json'
      );

      // Should not throw
      const techs = detector.detect(testDir);

      expect(Array.isArray(techs)).toBe(true);
    });
  });

  describe('version extraction', () => {
    it('should extract version from caret range', () => {
      const packageJson = {
        dependencies: { react: '^18.2.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);
      const react = techs.find(t => t.name === 'React');

      expect(react?.version).toBe('18.2.0');
    });

    it('should extract version from tilde range', () => {
      const packageJson = {
        dependencies: { react: '~18.2.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);
      const react = techs.find(t => t.name === 'React');

      expect(react?.version).toBe('18.2.0');
    });

    it('should handle versions without specifiers', () => {
      const packageJson = {
        dependencies: { react: '18.2.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);
      const react = techs.find(t => t.name === 'React');

      expect(react?.version).toBe('18.2.0');
    });
  });

  describe('edge cases', () => {
    it('should detect Express framework', () => {
      const packageJson = {
        dependencies: { express: '^4.18.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Express',
          category: 'framework'
        })
      );
    });

    it('should detect Vue framework', () => {
      const packageJson = {
        dependencies: { vue: '^3.0.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Vue',
          category: 'framework'
        })
      );
    });

    it('should detect Angular framework', () => {
      const packageJson = {
        dependencies: { '@angular/core': '^16.0.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Angular',
          category: 'framework'
        })
      );
    });

    it('should handle empty requirements.txt', () => {
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), '');

      const techs = detector.detectFromRequirements(testDir);

      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Python',
          category: 'language'
        })
      );
    });
  });

  describe('Django and Python framework detection', () => {
    it('should detect Django from requirements.txt', () => {
      const content = 'django==4.2.0\nrequests==2.31.0\n';
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), content);

      const techs = detector.detectFromRequirements(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Python',
          category: 'language'
        })
      );
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Django',
          category: 'framework'
        })
      );
    });

    it('should detect FastAPI from requirements.txt', () => {
      const content = 'fastapi==0.104.0\nuvicorn==0.24.0\n';
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), content);

      const techs = detector.detectFromRequirements(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'FastAPI',
          category: 'framework'
        })
      );
    });

    it('should detect Flask from requirements.txt', () => {
      const content = 'flask==3.0.0\n';
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), content);

      const techs = detector.detectFromRequirements(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Flask',
          category: 'framework'
        })
      );
    });
  });

  describe('Rails and Ruby framework detection', () => {
    it('should detect Rails from Gemfile', () => {
      const content = 'source "https://rubygems.org"\ngem "rails", "~> 7.0.0"\n';
      fs.writeFileSync(path.join(testDir, 'Gemfile'), content);

      const techs = detector.detectFromGemfile(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Ruby',
          category: 'language'
        })
      );
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Rails',
          category: 'framework'
        })
      );
    });

    it('should detect Sinatra from Gemfile', () => {
      const content = 'source "https://rubygems.org"\ngem "sinatra"\n';
      fs.writeFileSync(path.join(testDir, 'Gemfile'), content);

      const techs = detector.detectFromGemfile(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Sinatra',
          category: 'framework'
        })
      );
    });
  });

  describe('Extended JavaScript framework detection', () => {
    it('should detect Svelte framework', () => {
      const packageJson = {
        dependencies: { svelte: '^4.0.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Svelte',
          category: 'framework'
        })
      );
    });

    it('should detect Vite as a build tool', () => {
      const packageJson = {
        devDependencies: { vite: '^5.0.0' }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);
      
      expect(techs).toContainEqual(
        expect.objectContaining({
          name: 'Vite',
          category: 'framework'
        })
      );
    });

    it('should detect multiple frameworks in same project', () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          typescript: '^5.0.0',
          vite: '^5.0.0'
        }
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson)
      );

      const techs = detector.detectFromPackageJson(testDir);
      
      const hasReact = techs.some((t: any) => t.name === 'React');
      const hasVite = techs.some((t: any) => t.name === 'Vite');
      const hasTypeScript = techs.some((t: any) => t.name === 'TypeScript');
      
      expect(hasReact).toBe(true);
      expect(hasVite).toBe(true);
      expect(hasTypeScript).toBe(true);
    });
  });

  describe('Framework detection robustness', () => {
    it('should handle case-insensitive framework detection in requirements', () => {
      const content = 'DJANGO==4.2.0\nFlask==3.0.0\n';
      fs.writeFileSync(path.join(testDir, 'requirements.txt'), content);

      const techs = detector.detectFromRequirements(testDir);
      
      const hasDjango = techs.some((t: any) => t.name === 'Django');
      const hasFlask = techs.some((t: any) => t.name === 'Flask');
      
      expect(hasDjango).toBe(true);
      expect(hasFlask).toBe(true);
    });

    it('should not detect frameworks from empty project', () => {
      // Empty directory - no config files
      const techs = detector.detect(testDir);
      
      expect(techs.length).toBe(0);
    });
  });
});
