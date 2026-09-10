import { ToolDetector } from '../../domain/services/ToolDetector';
import { DatabaseValidator, ValidationReport } from '../../infrastructure/database/DatabaseValidator';
import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

export interface DiagnosticReport {
  tools: {
    editors: string[];
    runtimes: string[];
    development: string[];
  };
  database: ValidationReport;
}

export class SystemDiagnostics {
  private toolDetector: ToolDetector;
  private dbValidator: DatabaseValidator;

  constructor() {
    this.toolDetector = new ToolDetector();
    this.dbValidator = new DatabaseValidator();
  }

  public runDiagnostics(): DiagnosticReport {
    // Check tools
    const editors = this.toolDetector.detectEditors().map(t => `${t.name} (v${t.version || 'unknown'})`);
    const runtimes = this.toolDetector.detectRuntimes().map(t => `${t.name} (v${t.version || 'unknown'})`);
    const devTools = this.toolDetector.detectDevelopmentTools().map(t => `${t.name} (v${t.version || 'unknown'})`);

    // Ensure DB is open for validation
    const db = DatabaseConnection.getInstance();
    if (!db.isConnected()) {
      db.open();
    }

    // Check DB
    const dbReport = this.dbValidator.validate();

    return {
      tools: {
        editors,
        runtimes,
        development: devTools
      },
      database: dbReport
    };
  }
}
