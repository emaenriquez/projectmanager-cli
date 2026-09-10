import { Command } from 'commander';
import { ScanProjectsUseCase } from '../../application/use_cases/ScanProjectsUseCase';
import { AddProjectUseCase } from '../../application/use_cases/AddProjectUseCase';
import { RemoveProjectUseCase } from '../../application/use_cases/RemoveProjectUseCase';
import { OpenProjectUseCase } from '../../application/use_cases/OpenProjectUseCase';
import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { MigrationRunner } from '../../infrastructure/database/migrations/MigrationRunner';
import { getAllMigrations } from '../../infrastructure/database/migrations';

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.setupCommands();
  }

  private setupProgram() {
    this.program
      .name('project-hub')
      .description('A CLI application for managing development projects across multiple technologies')
      .version('0.1.0');
  }

  private initDb() {
    const db = DatabaseConnection.getInstance();
    if (!db.isConnected()) {
      db.open();
    }
    const migrationRunner = new MigrationRunner();
    migrationRunner.runPending(getAllMigrations());
  }

  private setupCommands() {
    this.program
      .command('scan')
      .description('Scan a directory for projects and add them to the hub')
      .argument('[path]', 'Directory to scan', '.')
      .option('--deep', 'Perform a deep scan')
      .action((pathStr, options) => {
        try {
          this.initDb();
          console.log(`Scanning ${pathStr}...`);
          const useCase = new ScanProjectsUseCase();
          const result = useCase.execute(pathStr);
          console.log(`Scan complete! Scanned ${result.scanned} directories.`);
          console.log(`Added: ${result.added}, Updated: ${result.updated} projects.`);
        } catch (err: any) {
          console.error(`Error scanning: ${err.message}`);
        }
      });

    this.program
      .command('add')
      .description('Add a specific project by path')
      .argument('<path>', 'Path to the project')
      .action((pathStr) => {
        try {
          this.initDb();
          const useCase = new AddProjectUseCase();
          const project = useCase.execute(pathStr);
          console.log(`Added project: ${project.name} (${project.path})`);
        } catch (err: any) {
          console.error(`Error adding project: ${err.message}`);
        }
      });

    this.program
      .command('remove')
      .description('Remove a project from the hub by ID')
      .argument('<id>', 'Project ID to remove')
      .action((id) => {
        try {
          this.initDb();
          const useCase = new RemoveProjectUseCase();
          useCase.execute(id);
          console.log(`Removed project with ID: ${id}`);
        } catch (err: any) {
          console.error(`Error removing project: ${err.message}`);
        }
      });

    this.program
      .command('open')
      .description('Open a project by ID')
      .argument('<id>', 'Project ID')
      .option('--with <tool>', 'Open with specific tool (e.g. code, cursor, subl)')
      .action((id, options) => {
        try {
          this.initDb();
          const useCase = new OpenProjectUseCase();
          useCase.execute(id, options.with);
          console.log(`Opening project...`);
        } catch (err: any) {
          console.error(`Error opening project: ${err.message}`);
        }
      });

    this.program
      .command('doctor')
      .description('Run system diagnostics')
      .action(async () => {
        const { SystemDiagnostics } = await import('../../application/use_cases/SystemDiagnostics');
        try {
          this.initDb();
          const diagnostics = new SystemDiagnostics();
          const report = diagnostics.runDiagnostics();
          
          console.log('\\n--- Editors ---');
          console.log(report.tools.editors.join('\\n') || 'None detected');
          console.log('\\n--- Runtimes ---');
          console.log(report.tools.runtimes.join('\\n') || 'None detected');
          console.log('\\n--- Development Tools ---');
          console.log(report.tools.development.join('\\n') || 'None detected');
          
          console.log('\\n--- Database Status ---');
          console.log(report.database.isValid ? 'VALID' : 'INVALID');
          if (report.database.errors.length > 0) {
            console.log('Errors:', report.database.errors);
          }
        } catch (err: any) {
          console.error(`Diagnostics failed: ${err.message}`);
        }
      });

    this.program
      .command('sync')
      .description('Sync all configured projects')
      .action(async () => {
        const { SyncProjectsUseCase } = await import('../../application/use_cases/SyncProjectsUseCase');
        try {
          this.initDb();
          const useCase = new SyncProjectsUseCase();
          const result = useCase.execute();
          console.log(`Sync complete!`);
          console.log(`Removed: ${result.removed}`);
          console.log(`Added: ${result.added}`);
          console.log(`Updated: ${result.updated}`);
        } catch (err: any) {
          console.error(`Error syncing projects: ${err.message}`);
        }
      });

    const config = this.program.command('config').description('Manage configuration');
    
    config.command('list')
      .description('List all configurations')
      .action(async () => {
        const { ConfigManager } = await import('../../application/ConfigManager');
        const cm = new ConfigManager();
        console.log(JSON.stringify(cm.getAll(), null, 2));
      });

    config.command('get <key>')
      .description('Get a configuration value')
      .action(async (key) => {
        const { ConfigManager } = await import('../../application/ConfigManager');
        const cm = new ConfigManager();
        const value = cm.get(key as any);
        console.log(value);
      });

    config.command('set <key> <value>')
      .description('Set a configuration value')
      .action(async (key, value) => {
        const { ConfigManager } = await import('../../application/ConfigManager');
        const cm = new ConfigManager();
        cm.set(key as any, value);
        console.log(`Config ${key} set successfully.`);
      });

    config.command('reset')
      .description('Reset configuration to default')
      .action(async () => {
        const { ConfigManager } = await import('../../application/ConfigManager');
        const cm = new ConfigManager();
        cm.reset();
        console.log('Configuration reset to defaults.');
      });
  }

  public run(argv: string[]) {
    this.program.parse(argv);
  }
}
