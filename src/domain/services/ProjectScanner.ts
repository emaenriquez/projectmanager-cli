import * as fs from 'fs';
import * as path from 'path';
import { getAllPatterns, ProjectPattern } from '../patterns/ProjectPatterns';
import { IgnoreFileParser, IgnorePattern } from './IgnoreFileParser';

export interface ProjectMetadata {
  name: string;
  path: string;
  timestamp: Date;
  configFiles: string[];
}

export interface ScanResult {
  projects: ProjectMetadata[];
  scannedDirectories: number;
  errors: ScanError[];
}

export interface ScanError {
  path: string;
  error: string;
  severity: 'warning' | 'error';
}

export class ProjectScanner {
  private readonly MAX_DEPTH = 10;
  private ignorePatterns: IgnorePattern[] = [];
  private scannedDirectories = 0;
  private errors: ScanError[] = [];
  private ignoreFileParser: IgnoreFileParser = new IgnoreFileParser();
  private rootPath: string = '';

  /**
   * Escanea un directorio recursivamente en busca de proyectos
   * @param rootPath Ruta raíz a escanear
   * @param depth Profundidad máxima de escaneo (por defecto: MAX_DEPTH)
   * @param patterns Patrones de configuración a detectar (por defecto: todos)
   * @param ignoreFile Nombre del archivo de ignorar (por defecto: .project-hub-ignore)
   * @returns ScanResult con proyectos encontrados, estadísticas y errores
   */
  scanDirectory(
    rootPath: string,
    depth: number = this.MAX_DEPTH,
    patterns?: ProjectPattern[],
    ignoreFile: string = '.project-hub-ignore'
  ): ScanResult {
    this.scannedDirectories = 0;
    this.errors = [];
    this.ignorePatterns = [];

    const absolutePath = this.resolvePath(rootPath);
    this.rootPath = absolutePath;

    // Validar que el directorio existe
    if (!fs.existsSync(absolutePath)) {
      this.errors.push({
        path: rootPath,
        error: `Directory does not exist: ${absolutePath}`,
        severity: 'error',
      });
      return {
        projects: [],
        scannedDirectories: 0,
        errors: this.errors,
      };
    }

    // Cargar patrones de ignorar desde el directorio raíz
    this.loadIgnoreFile(absolutePath, ignoreFile);

    const patternsToUse = patterns || getAllPatterns();
    const projects: ProjectMetadata[] = [];

    // Realizar escaneo recursivo
    const foundProjects = this.scanDirectoryRecursive(
      absolutePath,
      depth,
      patternsToUse,
      ignoreFile
    );

    projects.push(...foundProjects);

    return {
      projects,
      scannedDirectories: this.scannedDirectories,
      errors: this.errors,
    };
  }

  /**
   * Escanea recursivamente un directorio en busca de proyectos
   * @private
   */
  private scanDirectoryRecursive(
    currentPath: string,
    remainingDepth: number,
    patterns: ProjectPattern[],
    ignoreFile: string
  ): ProjectMetadata[] {
    const projects: ProjectMetadata[] = [];

    // Verificar límite de profundidad
    if (remainingDepth <= 0) {
      return projects;
    }

    // Verificar si debe ser ignorado
    if (this.shouldIgnore(currentPath)) {
      return projects;
    }

    try {
      this.scannedDirectories++;

      // Leer archivos en el directorio actual
      const files = fs.readdirSync(currentPath, { withFileTypes: true });

      // Cargar patrones de ignorar del directorio actual
      this.loadIgnoreFile(currentPath, ignoreFile);

      // Buscar archivos de configuración que indiquen un proyecto
      const configFiles = this.findConfigFiles(files, patterns);

      if (configFiles.length > 0) {
        const projectMetadata: ProjectMetadata = {
          name: path.basename(currentPath),
          path: currentPath,
          timestamp: this.getDirectoryTimestamp(currentPath),
          configFiles,
        };
        projects.push(projectMetadata);

        // No continuar buscando en subdirectorios de un proyecto detectado
        // (evitar detectar sub-proyectos)
        return projects;
      }

      // Buscar en subdirectorios
      for (const file of files) {
        if (file.isDirectory() && !file.name.startsWith('.')) {
          const subPath = path.join(currentPath, file.name);

          if (!this.shouldIgnore(subPath)) {
            const subProjects = this.scanDirectoryRecursive(
              subPath,
              remainingDepth - 1,
              patterns,
              ignoreFile
            );
            projects.push(...subProjects);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push({
        path: currentPath,
        error: `Failed to scan directory: ${errorMessage}`,
        severity: 'warning',
      });
    }

    return projects;
  }

  /**
   * Busca archivos de configuración en el directorio actual
   * @private
   */
  private findConfigFiles(
    files: fs.Dirent[],
    patterns: ProjectPattern[]
  ): string[] {
    const configFiles: string[] = [];
    const fileNames = new Set(files.map((f) => f.name));

    for (const pattern of patterns) {
      if (fileNames.has(pattern.filename)) {
        configFiles.push(pattern.filename);
      }
    }

    return configFiles;
  }

  /**
   * Carga patrones de ignorar desde un archivo .project-hub-ignore
   * @private
   */
  private loadIgnoreFile(dirPath: string, ignoreFile: string): void {
    const ignoreFilePath = path.join(dirPath, ignoreFile);

    try {
      const patterns = this.ignoreFileParser.parseIgnoreFile(ignoreFilePath);
      this.ignorePatterns.push(...patterns);
    } catch (error) {
      // Fallar silenciosamente si no se puede leer el archivo
    }
  }

  /**
   * Verifica si una ruta debe ser ignorada según los patrones cargados
   * @private
   */
  private shouldIgnore(dirPath: string): boolean {
    return this.ignoreFileParser.matches(
      dirPath,
      this.ignorePatterns,
      this.rootPath
    );
  }

  /**
   * Obtiene el timestamp de creación/modificación del directorio
   * @private
   */
  private getDirectoryTimestamp(dirPath: string): Date {
    try {
      const stats = fs.statSync(dirPath);
      // Usar birthtime si está disponible, sino mtime
      return stats.birthtime || stats.mtime;
    } catch {
      return new Date();
    }
  }

  /**
   * Resuelve una ruta relativa a absoluta, soportando ~
   * @private
   */
  private resolvePath(dirPath: string): string {
    if (dirPath.startsWith('~')) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      return path.join(homeDir, dirPath.slice(1));
    }
    return path.resolve(dirPath);
  }
}
