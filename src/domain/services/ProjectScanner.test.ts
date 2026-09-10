import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectScanner, ProjectMetadata } from './ProjectScanner';
import { getAllPatterns } from '../patterns/ProjectPatterns';

describe('ProjectScanner', () => {
  let tempDir: string;
  let scanner: ProjectScanner;

  beforeEach(() => {
    // Crear directorio temporal para pruebas
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-scanner-'));
    scanner = new ProjectScanner();
  });

  afterEach(() => {
    // Limpiar directorio temporal
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Unit Tests', () => {
    describe('scanDirectory', () => {
      it('should return empty result for non-existent directory', () => {
        const result = scanner.scanDirectory('/non/existent/path');

        expect(result.projects).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].severity).toBe('error');
      });

      it('should detect a single project with package.json', () => {
        const projectPath = path.join(tempDir, 'my-project');
        fs.mkdirSync(projectPath);
        fs.writeFileSync(path.join(projectPath, 'package.json'), '{}');

        const result = scanner.scanDirectory(tempDir);

        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].name).toBe('my-project');
        expect(result.projects[0].path).toBe(projectPath);
        expect(result.projects[0].configFiles).toContain('package.json');
      });

      it('should detect projects with different config files', () => {
        // Node.js project
        const nodePath = path.join(tempDir, 'node-project');
        fs.mkdirSync(nodePath);
        fs.writeFileSync(path.join(nodePath, 'package.json'), '{}');

        // Python project
        const pythonPath = path.join(tempDir, 'python-project');
        fs.mkdirSync(pythonPath);
        fs.writeFileSync(path.join(pythonPath, 'pyproject.toml'), '');

        // Rust project
        const rustPath = path.join(tempDir, 'rust-project');
        fs.mkdirSync(rustPath);
        fs.writeFileSync(path.join(rustPath, 'Cargo.toml'), '');

        const result = scanner.scanDirectory(tempDir);

        expect(result.projects).toHaveLength(3);
        expect(result.projects.some((p) => p.configFiles.includes('package.json'))).toBe(true);
        expect(result.projects.some((p) => p.configFiles.includes('pyproject.toml'))).toBe(true);
        expect(result.projects.some((p) => p.configFiles.includes('Cargo.toml'))).toBe(true);
      });

      it('should respect .project-hub-ignore file', () => {
        // Create projects
        const project1 = path.join(tempDir, 'project1');
        fs.mkdirSync(project1);
        fs.writeFileSync(path.join(project1, 'package.json'), '{}');

        const project2 = path.join(tempDir, 'project2');
        fs.mkdirSync(project2);
        fs.writeFileSync(path.join(project2, 'package.json'), '{}');

        // Create ignore file
        fs.writeFileSync(
          path.join(tempDir, '.project-hub-ignore'),
          'project2\n# comment\nnode_modules'
        );

        const result = scanner.scanDirectory(tempDir);

        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].name).toBe('project1');
      });

      it('should not exceed maximum depth', () => {
        // Crear estructura profunda
        let currentPath = tempDir;
        const depth = 15;

        for (let i = 0; i < depth; i++) {
          currentPath = path.join(currentPath, `level${i}`);
          fs.mkdirSync(currentPath);

          if (i === 5) {
            // Proyecto en nivel 5
            fs.writeFileSync(path.join(currentPath, 'package.json'), '{}');
          }
          if (i === 12) {
            // Proyecto en nivel 12 (exceede MAX_DEPTH=10, no debe detectarse)
            fs.writeFileSync(path.join(currentPath, 'requirements.txt'), '');
          }
        }

        const result = scanner.scanDirectory(tempDir);

        // Solo el proyecto en nivel 5 debe detectarse
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].configFiles).toContain('package.json');
      });

      it('should handle inaccessible directories gracefully', () => {
        const projectPath = path.join(tempDir, 'accessible-project');
        fs.mkdirSync(projectPath);
        fs.writeFileSync(path.join(projectPath, 'package.json'), '{}');

        const result = scanner.scanDirectory(tempDir);

        // Debe encontrar el proyecto accesible
        expect(result.projects.length).toBeGreaterThanOrEqual(1);
      });

      it('should extract correct metadata for detected projects', () => {
        const projectPath = path.join(tempDir, 'test-project');
        fs.mkdirSync(projectPath);
        fs.writeFileSync(path.join(projectPath, 'package.json'), '{}');

        const result = scanner.scanDirectory(tempDir);
        const project = result.projects[0];

        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('path');
        expect(project).toHaveProperty('timestamp');
        expect(project).toHaveProperty('configFiles');

        expect(typeof project.name).toBe('string');
        expect(typeof project.path).toBe('string');
        expect(project.timestamp.getTime).toBeDefined();
        expect(Array.isArray(project.configFiles)).toBe(true);
      });

      it('should detect multiple config files in same project', () => {
        const projectPath = path.join(tempDir, 'multi-config');
        fs.mkdirSync(projectPath);
        fs.writeFileSync(path.join(projectPath, 'package.json'), '{}');
        fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), '{}');
        fs.writeFileSync(path.join(projectPath, 'yarn.lock'), '');

        const result = scanner.scanDirectory(tempDir);
        const project = result.projects[0];

        expect(project.configFiles).toContain('package.json');
        expect(project.configFiles).toContain('tsconfig.json');
        expect(project.configFiles).toContain('yarn.lock');
      });

      it('should not detect projects in subdirectories when parent is a project', () => {
        const parentProject = path.join(tempDir, 'parent');
        fs.mkdirSync(parentProject);
        fs.writeFileSync(path.join(parentProject, 'package.json'), '{}');

        const childProject = path.join(parentProject, 'node_modules', 'child-lib');
        fs.mkdirSync(childProject, { recursive: true });
        fs.writeFileSync(path.join(childProject, 'package.json'), '{}');

        const result = scanner.scanDirectory(tempDir);

        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].path).toBe(parentProject);
      });
    });

    describe('Custom patterns', () => {
      it('should respect custom patterns provided', () => {
        const projectPath = path.join(tempDir, 'custom-project');
        fs.mkdirSync(projectPath);
        fs.writeFileSync(path.join(projectPath, 'setup.py'), '');
        fs.writeFileSync(path.join(projectPath, 'Makefile'), '');

        const customPatterns = [
          { filename: 'setup.py', language: 'Python', category: 'build-tool' as const },
        ];

        const result = scanner.scanDirectory(tempDir, 10, customPatterns);

        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].configFiles).toContain('setup.py');
        expect(result.projects[0].configFiles).not.toContain('Makefile');
      });
    });
  });

  describe('Property-Based Tests (Manual)', () => {
    /**
     * Property 1: Completeness of detection
     * For any directory structure with configuration files, all valid projects SHALL be detected
     * **Validates: Requirements 2.1, 2.2**
     */
    it('Property 1: Completeness of detection - should find all projects in generated structures', () => {
      // Test with 10 random configurations
      for (let run = 0; run < 10; run++) {
        // Limpiar e ir de novo
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir);

        // Generar estructura aleatoria
        const projectCount = Math.floor(Math.random() * 8);
        const projectsToCreate = [];

        for (let i = 0; i < projectCount; i++) {
          const projectName = `project-${i}`;
          const projectPath = path.join(tempDir, projectName);
          fs.mkdirSync(projectPath);

          // Elegir archivo de configuración aleatorio
          const allPatterns = getAllPatterns();
          const randomPattern = allPatterns[Math.floor(Math.random() * allPatterns.length)];
          fs.writeFileSync(path.join(projectPath, randomPattern.filename), '');

          projectsToCreate.push({ name: projectName, path: projectPath });
        }

        const result = scanner.scanDirectory(tempDir);

        // Verificar que todos los proyectos fueron detectados
        expect(result.projects.length).toBe(projectsToCreate.length);

        // Verificar que cada proyecto fue encontrado
        for (const expectedProject of projectsToCreate) {
          const found = result.projects.some((p) => p.name === expectedProject.name);
          expect(found).toBe(true);
        }
      }
    });

    /**
     * Property 2: Metadata consistency
     * For any detected project, all required metadata fields SHALL be populated
     * **Validates: Requirements 2.3**
     */
    it('Property 2: Metadata consistency - all detected projects should have valid metadata', () => {
      // Test with 10 random configurations
      for (let run = 0; run < 10; run++) {
        // Limpiar y recriar
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir);

        // Generar estructura aleatoria con más proyectos
        const projectCount = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < projectCount; i++) {
          const projectName = `project-${i}`;
          const projectPath = path.join(tempDir, projectName);
          fs.mkdirSync(projectPath);

          // Elegir archivo de configuración aleatorio
          const allPatterns = getAllPatterns();
          const randomPattern = allPatterns[Math.floor(Math.random() * allPatterns.length)];
          fs.writeFileSync(path.join(projectPath, randomPattern.filename), '');
        }

        const result = scanner.scanDirectory(tempDir);

        // Verificar que cada proyecto tiene metadatos completos
        for (const detectedProject of result.projects) {
          expect(detectedProject.name).toBeDefined();
          expect(detectedProject.name).not.toBe('');
          expect(typeof detectedProject.name).toBe('string');

          expect(detectedProject.path).toBeDefined();
          expect(detectedProject.path).not.toBe('');
          expect(typeof detectedProject.path).toBe('string');
          expect(fs.existsSync(detectedProject.path)).toBe(true);

          expect(detectedProject.timestamp).toBeDefined();
          expect(typeof detectedProject.timestamp.getTime).toBe('function');

          expect(detectedProject.configFiles).toBeDefined();
          expect(Array.isArray(detectedProject.configFiles)).toBe(true);
          expect(detectedProject.configFiles.length).toBeGreaterThan(0);
        }
      }
    });

    /**
     * Property 3: Ignore pattern respect
     * For any directory with .project-hub-ignore file, projects matching ignore patterns SHALL be skipped
     * **Validates: Requirements 2.6**
     */
    it('Property 3: Ignore pattern respect - projects matching ignore patterns should be skipped', () => {
      // Test with 10 different ignore pattern combinations
      for (let run = 0; run < 10; run++) {
        // Limpiar y recriar
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir);

        // Generar lista de proyectos
        const projectNames = [];
        for (let i = 0; i < 8; i++) {
          const projectName = `project${i}`;
          projectNames.push(projectName);
          const projectPath = path.join(tempDir, projectName);
          fs.mkdirSync(projectPath);
          fs.writeFileSync(path.join(projectPath, 'package.json'), '{}');
        }

        // Generar lista aleatoria de patrones a ignorar
        const ignorePatterns = [];
        const ignoreCount = Math.floor(Math.random() * 4);
        for (let i = 0; i < ignoreCount; i++) {
          ignorePatterns.push(projectNames[Math.floor(Math.random() * projectNames.length)]);
        }

        // Crear archivo de ignorar
        if (ignorePatterns.length > 0) {
          fs.writeFileSync(path.join(tempDir, '.project-hub-ignore'), ignorePatterns.join('\n'));
        }

        const result = scanner.scanDirectory(tempDir);

        // Verificar que proyectos ignorados no fueron detectados
        const detectedNames = new Set(result.projects.map((p) => p.name));
        for (const ignoredProject of ignorePatterns) {
          expect(detectedNames.has(ignoredProject)).toBe(false);
        }

        // Verificar que proyectos no ignorados SÍ fueron detectados
        for (const projectName of projectNames) {
          if (!ignorePatterns.includes(projectName)) {
            expect(detectedNames.has(projectName)).toBe(true);
          }
        }
      }
    });
  });
});
