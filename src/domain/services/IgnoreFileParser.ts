import * as fs from 'fs';
import * as path from 'path';

export interface IgnorePattern {
  pattern: string;
  negated: boolean;
}

/**
 * Parser para archivos .project-hub-ignore
 * Soporta:
 * - Comentarios (líneas que comienzan con #)
 * - Patrones glob simples (*, ?)
 * - Negación (!)
 */
export class IgnoreFileParser {
  /**
   * Parsea un archivo .project-hub-ignore
   * @param filePath Ruta al archivo .project-hub-ignore
   * @returns Array de patrones de ignorar
   */
  parseIgnoreFile(filePath: string): IgnorePattern[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      // Retornar array vacío si hay error al leer el archivo
      return [];
    }
  }

  /**
   * Parsea el contenido de un archivo .project-hub-ignore
   * @param content Contenido del archivo
   * @returns Array de patrones de ignorar
   */
  parseContent(content: string): IgnorePattern[] {
    return content
      .split('\n')
      .map((line) => this.normalizeLine(line))
      .filter((line): line is IgnorePattern => line !== null); // Filtrar líneas vacías
  }

  /**
   * Normaliza una línea del archivo .project-hub-ignore
   * @private
   */
  private normalizeLine(line: string): IgnorePattern | null {
    const trimmed = line.trim();

    // Ignorar líneas vacías y comentarios
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      return null;
    }

    // Procesar negación (!)
    let negated = false;
    let pattern = trimmed;

    if (pattern.startsWith('!')) {
      negated = true;
      pattern = pattern.slice(1).trim();
    }

    if (pattern.length === 0) {
      return null;
    }

    return {
      pattern: this.normalizePattern(pattern),
      negated,
    };
  }

  /**
   * Normaliza un patrón para uso en coincidencia
   * @private
   */
  private normalizePattern(pattern: string): string {
    // Eliminar barras iniciales
    pattern = pattern.replace(/^\/+/, '');
    // Eliminar barras finales
    pattern = pattern.replace(/\/+$/, '');
    return pattern;
  }

  /**
   * Verifica si una ruta coincide con patrones de ignorar
   * @param dirPath Ruta del directorio
   * @param patterns Patrones de ignorar
   * @param baseDir Directorio base para resolución relativa (opcional)
   * @returns true si la ruta debe ser ignorada
   */
  matches(dirPath: string, patterns: IgnorePattern[], baseDir?: string): boolean {
    let shouldIgnore = false;

    // Obtener la ruta relativa si se proporciona baseDir
    let relativePath = dirPath;
    if (baseDir) {
      try {
        relativePath = path.relative(baseDir, dirPath).replace(/\\/g, '/');
      } catch {
        relativePath = dirPath;
      }
    }

    // Procesar patrones en orden
    for (const pattern of patterns) {
      if (this.pathMatches(relativePath, pattern.pattern)) {
        if (pattern.negated) {
          shouldIgnore = false;
        } else {
          shouldIgnore = true;
        }
      }
    }

    return shouldIgnore;
  }

  /**
   * Verifica si una ruta coincide con un patrón específico
   * @private
   */
  private pathMatches(dirPath: string, pattern: string): boolean {
    // Normalizar separadores
    const normalizedPath = dirPath.replace(/\\/g, '/');

    // Si el patrón es exacto (sin wildcards), hacer coincidencia exacta
    if (!pattern.includes('*') && !pattern.includes('?')) {
      // Coincidencia exacta o como parte del nombre
      const pathParts = normalizedPath.split('/');
      const patternParts = pattern.split('/');

      // Si es el nombre del directorio
      if (pathParts[pathParts.length - 1] === pattern) {
        return true;
      }

      // Si es parte de la ruta
      if (normalizedPath === pattern || normalizedPath.endsWith('/' + pattern)) {
        return true;
      }

      return false;
    }

    // Conversión de glob pattern a regex
    const regexPattern = this.globToRegex(pattern);
    return regexPattern.test(normalizedPath);
  }

  /**
   * Convierte un patrón glob a expresión regular
   * Soporta: * (cualquier cosa excepto /), ** (múltiples niveles), ? (un carácter)
   * @private
   */
  private globToRegex(glob: string): RegExp {
    // Escapar caracteres especiales de regex excepto * y ?
    let regex = glob
      .replace(/\./g, '\\.')
      .replace(/\+/g, '\\+')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\|/g, '\\|')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$');

    // Procesar ** (múltiples niveles)
    regex = regex.replace(/\*\*/g, '___DOUBLESTAR___');

    // Procesar * (un nivel)
    regex = regex.replace(/\*/g, '[^/]*');

    // Procesar ? (un carácter)
    regex = regex.replace(/\?/g, '[^/]');

    // Reemplazar el marcador de **
    regex = regex.replace(/___DOUBLESTAR___/g, '.*');

    // Hacer que coincida en cualquier parte del path
    return new RegExp(`(^|/)${regex}(/|$)`);
  }
}
