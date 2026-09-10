import { DatabaseConnection } from './DatabaseConnection';

/**
 * Validation report structure
 */
export interface ValidationReport {
  isValid: boolean;
  schema: SchemaValidationResult;
  constraints: ConstraintValidationResult;
  errors: string[];
  warnings: string[];
  repairAttempted: boolean;
  repairSuccessful: boolean;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  missingTables: string[];
  invalidColumns: ColumnValidationResult[];
  invalidIndexes: string[];
}

/**
 * Column validation result
 */
export interface ColumnValidationResult {
  table: string;
  column: string;
  expectedType: string;
  actualType: string;
  issue: string;
}

/**
 * Constraint validation result
 */
export interface ConstraintValidationResult {
  isValid: boolean;
  orphanRecords: OrphanRecord[];
  violatedConstraints: ConstraintViolation[];
}

/**
 * Orphan record structure
 */
export interface OrphanRecord {
  table: string;
  foreignKeyColumn: string;
  recordCount: number;
  referencedTable: string;
}

/**
 * Constraint violation structure
 */
export interface ConstraintViolation {
  table: string;
  constraint: string;
  description: string;
  severity: 'critical' | 'warning';
}

/**
 * DatabaseValidator provides comprehensive database integrity checking and repair capabilities
 * Validates schema consistency, foreign key constraints, and data integrity
 */
export class DatabaseValidator {
  private db: DatabaseConnection;

  /**
   * Expected database schema definition
   */
  private expectedSchema = {
    projects: {
      columns: {
        id: 'TEXT',
        name: 'TEXT',
        path: 'TEXT',
        created_at: 'DATETIME',
        last_opened: 'DATETIME',
        is_favorite: 'BOOLEAN',
        default_tool: 'TEXT',
        notes: 'TEXT'
      },
      primaryKey: 'id',
      uniqueConstraints: ['path']
    },
    tags: {
      columns: {
        id: 'TEXT',
        name: 'TEXT',
        created_at: 'DATETIME'
      },
      primaryKey: 'id',
      uniqueConstraints: ['name']
    },
    project_tags: {
      columns: {
        project_id: 'TEXT',
        tag_id: 'TEXT',
        added_at: 'DATETIME'
      },
      primaryKey: ['project_id', 'tag_id'],
      foreignKeys: [
        { column: 'project_id', references: 'projects(id)', onDelete: 'CASCADE' },
        { column: 'tag_id', references: 'tags(id)', onDelete: 'CASCADE' }
      ]
    },
    technologies: {
      columns: {
        id: 'TEXT',
        project_id: 'TEXT',
        name: 'TEXT',
        version: 'TEXT',
        category: 'TEXT',
        detected_at: 'DATETIME'
      },
      primaryKey: 'id',
      foreignKeys: [{ column: 'project_id', references: 'projects(id)', onDelete: 'CASCADE' }]
    }
  };

  /**
   * Expected indexes
   */
  private expectedIndexes = [
    'idx_projects_name',
    'idx_projects_path',
    'idx_project_tags_project_id',
    'idx_project_tags_tag_id',
    'idx_technologies_project_id',
    'idx_technologies_name'
  ];

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Run comprehensive database validation
   * @returns ValidationReport with complete validation results
   */
  public validate(): ValidationReport {
    const report: ValidationReport = {
      isValid: true,
      schema: { isValid: true, missingTables: [], invalidColumns: [], invalidIndexes: [] },
      constraints: { isValid: true, orphanRecords: [], violatedConstraints: [] },
      errors: [],
      warnings: [],
      repairAttempted: false,
      repairSuccessful: false
    };

    // Validate schema
    const schemaResult = this.validateSchema();
    report.schema = schemaResult;

    if (!schemaResult.isValid) {
      report.isValid = false;
      schemaResult.missingTables.forEach((table) => {
        report.errors.push(`Missing table: ${table}`);
      });
      schemaResult.invalidColumns.forEach((col) => {
        report.errors.push(`Invalid column in ${col.table}.${col.column}: ${col.issue}`);
      });
      schemaResult.invalidIndexes.forEach((idx) => {
        report.warnings.push(`Missing index: ${idx}`);
      });
    }

    // Validate constraints
    const constraintsResult = this.validateConstraints();
    report.constraints = constraintsResult;

    if (!constraintsResult.isValid) {
      report.isValid = false;
      constraintsResult.orphanRecords.forEach((orphan) => {
        report.errors.push(
          `Orphan records in ${orphan.table}.${orphan.foreignKeyColumn}: ` +
          `${orphan.recordCount} records referencing non-existent ${orphan.referencedTable}`
        );
      });
      constraintsResult.violatedConstraints.forEach((violation) => {
        const messageType = violation.severity === 'critical' ? 'ERROR' : 'WARNING';
        report[violation.severity === 'critical' ? 'errors' : 'warnings'].push(
          `${messageType} in ${violation.table}: ${violation.constraint} - ${violation.description}`
        );
      });
    }

    return report;
  }

  /**
   * Validate database schema
   * Checks that all required tables exist with correct columns and structure
   */
  private validateSchema(): SchemaValidationResult {
    const result: SchemaValidationResult = {
      isValid: true,
      missingTables: [],
      invalidColumns: [],
      invalidIndexes: []
    };

    try {
      // Check all tables exist
      for (const tableName of Object.keys(this.expectedSchema)) {
        const tableExists = this.tableExists(tableName);

        if (!tableExists) {
          result.missingTables.push(tableName);
          result.isValid = false;
          continue;
        }

        // Validate columns in existing table
        const tableInfo = this.getTableInfo(tableName);
        const expectedColumns = (this.expectedSchema as any)[tableName].columns;

        for (const [columnName, expectedType] of Object.entries(expectedColumns)) {
          const actualColumn = tableInfo.find((col: any) => col.name === columnName);

          if (!actualColumn) {
            result.invalidColumns.push({
              table: tableName,
              column: columnName,
              expectedType: expectedType as string,
              actualType: 'MISSING',
              issue: `Column does not exist, expected type: ${expectedType}`
            });
            result.isValid = false;
          }
        }
      }

      // Check indexes
      const existingIndexes = this.getExistingIndexes();
      for (const indexName of this.expectedIndexes) {
        if (!existingIndexes.includes(indexName)) {
          result.invalidIndexes.push(indexName);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Schema validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate database constraints
   * Checks for orphan records and constraint violations
   */
  private validateConstraints(): ConstraintValidationResult {
    const result: ConstraintValidationResult = {
      isValid: true,
      orphanRecords: [],
      violatedConstraints: []
    };

    try {
      // Check for orphan records in project_tags
      const orphanProjectTags = this.checkOrphanRecords('project_tags', 'project_id', 'projects', 'id');
      if (orphanProjectTags > 0) {
        result.orphanRecords.push({
          table: 'project_tags',
          foreignKeyColumn: 'project_id',
          recordCount: orphanProjectTags,
          referencedTable: 'projects'
        });
        result.isValid = false;
      }

      const orphanTagRecords = this.checkOrphanRecords('project_tags', 'tag_id', 'tags', 'id');
      if (orphanTagRecords > 0) {
        result.orphanRecords.push({
          table: 'project_tags',
          foreignKeyColumn: 'tag_id',
          recordCount: orphanTagRecords,
          referencedTable: 'tags'
        });
        result.isValid = false;
      }

      // Check for orphan records in technologies
      const orphanTechnologies = this.checkOrphanRecords('technologies', 'project_id', 'projects', 'id');
      if (orphanTechnologies > 0) {
        result.orphanRecords.push({
          table: 'technologies',
          foreignKeyColumn: 'project_id',
          recordCount: orphanTechnologies,
          referencedTable: 'projects'
        });
        result.isValid = false;
      }

      // Check for duplicate paths in projects (UNIQUE constraint)
      const duplicatePaths = this.checkDuplicateUniqueConstraint('projects', 'path');
      if (duplicatePaths > 0) {
        result.violatedConstraints.push({
          table: 'projects',
          constraint: 'UNIQUE(path)',
          description: `${duplicatePaths} duplicate project paths found`,
          severity: 'critical'
        });
        result.isValid = false;
      }

      // Check for duplicate tag names
      const duplicateTagNames = this.checkDuplicateUniqueConstraint('tags', 'name');
      if (duplicateTagNames > 0) {
        result.violatedConstraints.push({
          table: 'tags',
          constraint: 'UNIQUE(name)',
          description: `${duplicateTagNames} duplicate tag names found`,
          severity: 'critical'
        });
        result.isValid = false;
      }

      // Check for NULL values in NOT NULL columns
      const nullInProjects = this.checkNullConstraints('projects', ['id', 'name', 'path']);
      if (nullInProjects.length > 0) {
        nullInProjects.forEach((column) => {
          result.violatedConstraints.push({
            table: 'projects',
            constraint: `NOT NULL(${column})`,
            description: `Found NULL values in NOT NULL column: ${column}`,
            severity: 'critical'
          });
        });
        result.isValid = false;
      }

      return result;
    } catch (error) {
      throw new Error(`Constraint validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Attempt to repair database integrity issues
   * Returns report of repair attempts
   */
  public repair(): ValidationReport {
    const report = this.validate();
    report.repairAttempted = true;

    try {
      // Repair schema issues
      if (report.schema.missingTables.length > 0) {
        this.repairMissingTables(report.schema.missingTables);
      }

      if (report.schema.invalidColumns.length > 0) {
        this.repairInvalidColumns(report.schema.invalidColumns);
      }

      if (report.schema.invalidIndexes.length > 0) {
        this.repairMissingIndexes(report.schema.invalidIndexes);
      }

      // Repair constraint violations
      if (report.constraints.orphanRecords.length > 0) {
        this.repairOrphanRecords(report.constraints.orphanRecords);
      }

      if (report.constraints.violatedConstraints.length > 0) {
        this.repairConstraintViolations(report.constraints.violatedConstraints);
      }

      // Re-validate after repairs
      const revalidationReport = this.validate();

      if (revalidationReport.isValid) {
        report.repairSuccessful = true;
        report.errors = [];
        report.warnings = [];
      } else {
        report.repairSuccessful = false;
        report.errors.push('Some issues could not be automatically repaired');
      }

      return report;
    } catch (error) {
      report.repairSuccessful = false;
      report.errors.push(`Repair failed: ${error instanceof Error ? error.message : String(error)}`);
      return report;
    }
  }

  /**
   * Recreate missing tables
   */
  private repairMissingTables(missingTables: string[]): void {
    for (const tableName of missingTables) {
      if (tableName === 'projects') {
        this.db.execute(`
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_opened DATETIME,
            is_favorite BOOLEAN DEFAULT 0,
            default_tool TEXT,
            notes TEXT
          )
        `);
      } else if (tableName === 'tags') {
        this.db.execute(`
          CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else if (tableName === 'project_tags') {
        this.db.execute(`
          CREATE TABLE IF NOT EXISTS project_tags (
            project_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (project_id, tag_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
          )
        `);
      } else if (tableName === 'technologies') {
        this.db.execute(`
          CREATE TABLE IF NOT EXISTS technologies (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            version TEXT,
            category TEXT,
            detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
      }
    }
  }

  /**
   * Add missing columns to tables
   */
  private repairInvalidColumns(invalidColumns: ColumnValidationResult[]): void {
    // Group by table
    const columnsByTable = invalidColumns.reduce((acc, col) => {
      if (!acc[col.table]) acc[col.table] = [];
      acc[col.table].push(col);
      return acc;
    }, {} as Record<string, ColumnValidationResult[]>);

    // Add missing columns
    for (const [tableName, columns] of Object.entries(columnsByTable)) {
      for (const col of columns) {
        try {
          const defaultValue = this.getDefaultValueForType(col.expectedType);
          this.db.execute(
            `ALTER TABLE ${tableName} ADD COLUMN ${col.column} ${col.expectedType} DEFAULT ${defaultValue}`
          );
        } catch (error) {
          // Column might already exist, skip
          console.warn(`Could not add column ${col.column} to ${tableName}: ${error}`);
        }
      }
    }
  }

  /**
   * Recreate missing indexes
   */
  private repairMissingIndexes(missingIndexes: string[]): void {
    const indexDefinitions: Record<string, string> = {
      idx_projects_name: 'CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)',
      idx_projects_path: 'CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)',
      idx_project_tags_project_id: 'CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id)',
      idx_project_tags_tag_id: 'CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id)',
      idx_technologies_project_id: 'CREATE INDEX IF NOT EXISTS idx_technologies_project_id ON technologies(project_id)',
      idx_technologies_name: 'CREATE INDEX IF NOT EXISTS idx_technologies_name ON technologies(name)'
    };

    for (const indexName of missingIndexes) {
      if (indexDefinitions[indexName]) {
        this.db.execute(indexDefinitions[indexName]);
      }
    }
  }

  /**
   * Remove orphan records
   */
  private repairOrphanRecords(orphanRecords: OrphanRecord[]): void {
    for (const orphan of orphanRecords) {
      // Delete orphan records
      const sql = `
        DELETE FROM ${orphan.table}
        WHERE ${orphan.foreignKeyColumn} NOT IN (
          SELECT id FROM ${orphan.referencedTable}
        )
      `;
      this.db.execute(sql);
    }
  }

  /**
   * Repair constraint violations
   */
  private repairConstraintViolations(violations: ConstraintViolation[]): void {
    for (const violation of violations) {
      if (violation.constraint.includes('UNIQUE')) {
        // Handle duplicate unique values
        if (violation.table === 'projects' && violation.constraint === 'UNIQUE(path)') {
          this.removeDuplicateUniqueValues('projects', 'path');
        } else if (violation.table === 'tags' && violation.constraint === 'UNIQUE(name)') {
          this.removeDuplicateUniqueValues('tags', 'name');
        }
      } else if (violation.constraint.includes('NOT NULL')) {
        // Handle NULL values in NOT NULL columns
        const columnMatch = violation.constraint.match(/NOT NULL\((\w+)\)/);
        if (columnMatch) {
          const column = columnMatch[1];
          this.removeRecordsWithNullColumn(violation.table, column);
        }
      }
    }
  }

  /**
   * Helper: Check if table exists
   */
  private tableExists(tableName: string): boolean {
    try {
      const result = this.db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      );
      return result ? result.count > 0 : false;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Get table info (columns)
   */
  private getTableInfo(tableName: string): any[] {
    try {
      return this.db.query(`PRAGMA table_info(${tableName})`);
    } catch {
      return [];
    }
  }

  /**
   * Helper: Get existing indexes
   */
  private getExistingIndexes(): string[] {
    try {
      const result = this.db.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
      );
      return result.map((idx) => idx.name);
    } catch {
      return [];
    }
  }

  /**
   * Helper: Check for orphan records
   */
  private checkOrphanRecords(
    table: string,
    foreignKeyColumn: string,
    referencedTable: string,
    referencedColumn: string
  ): number {
    try {
      const result = this.db.queryOne<{ count: number }>(
        `
        SELECT COUNT(*) as count FROM ${table}
        WHERE ${foreignKeyColumn} NOT IN (
          SELECT ${referencedColumn} FROM ${referencedTable}
        )
      `
      );
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Check for duplicate unique constraint values
   */
  private checkDuplicateUniqueConstraint(table: string, column: string): number {
    try {
      const result = this.db.queryOne<{ count: number }>(
        `
        SELECT COUNT(*) - COUNT(DISTINCT ${column}) as count FROM ${table}
      `
      );
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Check for NULL values in columns
   */
  private checkNullConstraints(table: string, columns: string[]): string[] {
    const nullColumns: string[] = [];

    for (const column of columns) {
      try {
        const result = this.db.queryOne<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${table} WHERE ${column} IS NULL`
        );
        if (result && result.count > 0) {
          nullColumns.push(column);
        }
      } catch {
        // Skip if column doesn't exist
      }
    }

    return nullColumns;
  }

  /**
   * Helper: Get default value for a column type
   */
  private getDefaultValueForType(type: string): string {
    if (type.includes('TEXT') || type.includes('VARCHAR')) return "''";
    if (type.includes('DATETIME')) return 'CURRENT_TIMESTAMP';
    if (type.includes('BOOLEAN') || type.includes('INT')) return '0';
    return 'NULL';
  }

  /**
   * Helper: Remove duplicate unique values (keep first, delete rest)
   */
  private removeDuplicateUniqueValues(table: string, column: string): void {
    this.db.execute(`
      DELETE FROM ${table}
      WHERE rowid NOT IN (
        SELECT MIN(rowid) FROM ${table}
        GROUP BY ${column}
      )
    `);
  }

  /**
   * Helper: Remove records with NULL in specified column
   */
  private removeRecordsWithNullColumn(table: string, column: string): void {
    this.db.execute(`
      DELETE FROM ${table}
      WHERE ${column} IS NULL
    `);
  }

  /**
   * Get a detailed validation summary as formatted string
   */
  public getValidationSummary(report: ValidationReport): string {
    let summary = 'Database Validation Report\n';
    summary += '===========================\n\n';

    summary += `Status: ${report.isValid ? '✓ VALID' : '✗ INVALID'}\n`;
    summary += `Errors: ${report.errors.length}\n`;
    summary += `Warnings: ${report.warnings.length}\n\n`;

    if (report.errors.length > 0) {
      summary += 'Errors:\n';
      report.errors.forEach((error) => {
        summary += `  - ${error}\n`;
      });
      summary += '\n';
    }

    if (report.warnings.length > 0) {
      summary += 'Warnings:\n';
      report.warnings.forEach((warning) => {
        summary += `  - ${warning}\n`;
      });
      summary += '\n';
    }

    if (report.repairAttempted) {
      summary += `Repair Attempted: ${report.repairSuccessful ? '✓ Successful' : '✗ Failed'}\n`;
    }

    return summary;
  }
}
