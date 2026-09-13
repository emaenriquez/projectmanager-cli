import { spawn } from 'child_process';
import { ProjectRepository, ProjectEntity } from '../../infrastructure/repositories/ProjectRepository';
import { ToolDetector } from '../../domain/services/ToolDetector';
import * as os from 'os';

export class OpenProjectUseCase {
  private projectRepo: ProjectRepository;
  private toolDetector: ToolDetector;

  constructor() {
    this.projectRepo = new ProjectRepository();
    this.toolDetector = new ToolDetector();
  }

  public execute(projectId: string, toolName?: string): void {
    const project = this.projectRepo.findById(projectId);

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const command = this.getToolCommand(toolName);

    if (!command) {
      throw new Error(`Could not determine command for tool: ${toolName || 'default editor'}`);
    }

    project.last_opened = new Date().toISOString();
    this.projectRepo.update(project);

    this.spawnProcess(command, project.path);
  }

  private getToolCommand(toolName?: string): string | undefined {
    if (toolName && ['system default', 'default', 'explorer'].includes(toolName.trim().toLowerCase())) {
      return os.platform() === 'win32' ? 'explorer' : (os.platform() === 'darwin' ? 'open' : 'xdg-open');
    }

    const editors = this.toolDetector.detectEditors();

    if (toolName && toolName.trim().length > 0) {
      const matchingEditor = editors.find((editor: any) =>
        editor.name.toLowerCase() === toolName.trim().toLowerCase()
        || editor.name.toLowerCase().replace(/\s+/g, '-') === toolName.trim().toLowerCase().replace(/\s+/g, '-')
      );

      const mapped = this.resolveToolCommand(toolName);

      // If matchingEditor is a direct executable (like Antigravity.exe) and mapped is not a CLI command on PATH,
      // use the full executable path
      if (matchingEditor?.path && matchingEditor.path.toLowerCase().endsWith('.exe')) {
        return matchingEditor.path;
      }

      if (mapped) {
        return mapped;
      }

      if (matchingEditor?.path) {
        return matchingEditor.path;
      }
    }

    if (editors.length > 0) {
      const defaultEditor = editors[0];
      const mappedDefault = this.resolveToolCommand(defaultEditor.name);
      if (defaultEditor.path && defaultEditor.path.toLowerCase().endsWith('.exe')) {
        return defaultEditor.path;
      }
      if (mappedDefault) {
        return mappedDefault;
      }
      if (defaultEditor.path) {
        return defaultEditor.path;
      }
    }

    return os.platform() === 'win32' ? 'explorer' : (os.platform() === 'darwin' ? 'open' : 'xdg-open');
  }

  private resolveToolCommand(toolName?: string): string | undefined {
    if (!toolName || toolName.trim().length === 0) {
      return undefined;
    }

    const normalized = toolName.trim().toLowerCase();
    const compact = normalized.replace(/\s+/g, ' ').replace(/[-_]+/g, ' ');
    const commandMap: Record<string, string> = {
      'vscode': 'code',
      'vs code': 'code',
      'visual studio code': 'code',
      'code': 'code',
      'cursor': 'cursor',
      'sublime text': 'subl',
      'sublime': 'subl',
      'subl': 'subl',
      'neovim': 'nvim',
      'nvim': 'nvim',
      'vim': 'vim',
      'kiro': 'kiro',
      'kiro cli': 'kiro',
      'kiro-cli': 'kiro',
      'antigravity': 'antigravity',
      'antigravity ide': 'antigravity-ide',
      'antigravity-ide': 'antigravity-ide',
      'antigravity cli': 'antigravity-ide',
      'antigravity-cli': 'antigravity-ide'
    };

    return commandMap[normalized] || commandMap[compact] || toolName;
  }

  private spawnProcess(command: string, projectPath: string): void {
    const isWindows = os.platform() === 'win32';

    try {
      if (isWindows) {
        if (command.toLowerCase() === 'explorer' || command.toLowerCase() === 'explorer.exe') {
          const child = spawn('explorer.exe', [projectPath], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
          return;
        }

        if (command.toLowerCase().endsWith('.exe')) {
          const child = spawn(command, [projectPath], {
            detached: true,
            stdio: 'ignore',
            shell: false
          });
          child.unref();
          return;
        }

        // For CLI commands (code, kiro, antigravity-ide, etc.)
        const child = spawn(command, [projectPath], {
          detached: true,
          stdio: 'ignore',
          shell: true
        });
        child.unref();
      } else {
        const child = spawn(command, [projectPath], {
          detached: true,
          stdio: 'ignore',
          shell: false
        });
        child.unref();
      }
    } catch (error) {
      throw new Error(`Failed to open project with ${command}: ${error}`);
    }
  }
}
