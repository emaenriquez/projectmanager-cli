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

    // Update last_opened timestamp
    project.last_opened = new Date().toISOString();
    this.projectRepo.update(project);

    // Open tool
    this.spawnProcess(command, project.path);
  }

  private getToolCommand(toolName?: string): string | undefined {
    if (toolName) {
      // Find specific tool logic could be elaborated here
      // For simplicity, map some common tools
      const toolMap: Record<string, string> = {
        'vscode': 'code',
        'code': 'code',
        'cursor': 'cursor',
        'subl': 'subl',
        'nvim': 'nvim'
      };
      return toolMap[toolName.toLowerCase()] || toolName;
    }

    // Default to first available editor
    const editors = this.toolDetector.detectEditors();
    if (editors.length > 0) {
      // Very basic mapping for the detected name to command
      const nameToCommand: Record<string, string> = {
        'VS Code': 'code',
        'Cursor': 'cursor',
        'Sublime Text': 'subl',
        'Neovim': 'nvim',
        'Vim': 'vim'
      };
      return nameToCommand[editors[0].name];
    }
    
    // Fallbacks
    return os.platform() === 'win32' ? 'start' : 'open';
  }

  private spawnProcess(command: string, projectPath: string): void {
    const isWindows = os.platform() === 'win32';
    
    try {
      if (isWindows) {
        const child = spawn(`${command} "${projectPath}"`, {
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
