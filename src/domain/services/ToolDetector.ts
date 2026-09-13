import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a detected tool on the system
 */
export interface DetectedTool {
  name: string;
  path?: string;
  version?: string;
  available: boolean;
}

/**
 * ToolDetector detects installed tools and development environments
 * Supports Windows, Linux, and macOS
 */
export class ToolDetector {
  private readonly TIMEOUT_MS = 2000;

  /**
   * Detect all tools on the system
   * @returns Map of tool categories to detected tools
   */
  public detectAll(): Map<string, DetectedTool[]> {
    const tools = new Map<string, DetectedTool[]>();

    // Detect editors
    tools.set('editors', this.detectEditors());

    // Detect runtimes
    tools.set('runtimes', this.detectRuntimes());

    // Detect development tools
    tools.set('tools', this.detectDevelopmentTools());

    return tools;
  }

  /**
   * Detect installed code editors
   * Checks PATH for: VS Code, Cursor, Sublime Text, Neovim, Vim,
   * and scans the Windows LocalAppData Programs tree for Kiro,
   * Antigravity, and Antigravity IDE executables.
   */
  public detectEditors(): DetectedTool[] {
    const editors: DetectedTool[] = [];

    // VS Code
    const vsCode = this.detectTool('code', false);
    if (vsCode.available) {
      editors.push({ name: 'VS Code', ...vsCode, available: true });
    }

    // Cursor
    const cursor = this.detectTool('cursor', false);
    if (cursor.available) {
      editors.push({ name: 'Cursor', ...cursor, available: true });
    }

    // Sublime Text
    const sublime = this.detectTool('subl', false);
    if (sublime.available) {
      editors.push({ name: 'Sublime Text', ...sublime, available: true });
    }

    // Neovim
    const neovim = this.detectTool('nvim', false);
    if (neovim.available) {
      editors.push({ name: 'Neovim', ...neovim, available: true });
    }

    // Vim
    const vim = this.detectTool('vim', false);
    if (vim.available) {
      editors.push({ name: 'Vim', ...vim, available: true });
    }

    // Kiro
    const kiro = this.detectTool('kiro', false);
    if (kiro.available) {
      editors.push({ name: 'Kiro', ...kiro, available: true });
    }

    // Kiro CLI
    const kiroCli = this.detectTool('kiro-cli', false);
    if (kiroCli.available) {
      editors.push({ name: 'Kiro CLI', ...kiroCli, available: true });
    }

    // Antigravity
    const antigravity = this.detectTool('antigravity', false);
    if (antigravity.available) {
      editors.push({ name: 'Antigravity', ...antigravity, available: true });
    }

    // Antigravity IDE
    const antigravityIde = this.detectTool('antigravity-ide', false);
    if (antigravityIde.available) {
      editors.push({ name: 'Antigravity IDE', ...antigravityIde, available: true });
    }

    // Antigravy (alias/compatibility)
    const antigravy = this.detectTool('antigravy', false);
    if (antigravy.available) {
      editors.push({ name: 'Antigravy', ...antigravy, available: true });
    }

    // Antigravy CLI (alias/compatibility)
    const antigravyCli = this.detectTool('antigravy-cli', false);
    if (antigravyCli.available) {
      editors.push({ name: 'Antigravy CLI', ...antigravyCli, available: true });
    }

    const localEditors = this.detectEditorsFromLocalPrograms();
    for (const editor of localEditors) {
      const existing = editors.find(existingEditor => existingEditor.name === editor.name);
      if (!existing) {
        editors.push(editor);
      }
    }

    return editors;
  }

  /**
   * Detect installed runtimes
   */
  public detectRuntimes(): DetectedTool[] {
    const runtimes: DetectedTool[] = [];

    // Node.js
    const node = this.detectTool('node');
    if (node.available) {
      runtimes.push({ name: 'Node.js', ...node, available: true });
    }

    // Python (try both python and python3)
    let python = this.detectTool('python3');
    if (!python.available) {
      python = this.detectTool('python');
    }
    if (python.available) {
      runtimes.push({ name: 'Python', ...python, available: true });
    }

    // Rust
    const rustc = this.detectTool('rustc');
    if (rustc.available) {
      runtimes.push({ name: 'Rust', ...rustc, available: true });
    }

    // Go
    const go = this.detectTool('go');
    if (go.available) {
      runtimes.push({ name: 'Go', ...go, available: true });
    }

    // Java
    const java = this.detectTool('java');
    if (java.available) {
      runtimes.push({ name: 'Java', ...java, available: true });
    }

    // PHP
    const php = this.detectTool('php');
    if (php.available) {
      runtimes.push({ name: 'PHP', ...php, available: true });
    }

    return runtimes;
  }

  /**
   * Detect development tools
   * Includes: Git, Docker, Kiro, Claude Code, npm, yarn
   */
  public detectDevelopmentTools(): DetectedTool[] {
    const tools: DetectedTool[] = [];

    // Git
    const git = this.detectTool('git');
    if (git.available) {
      tools.push({ name: 'Git', ...git, available: true });
    }

    // Docker
    const docker = this.detectTool('docker');
    if (docker.available) {
      tools.push({ name: 'Docker', ...docker, available: true });
    }

    // Kiro
    const kiro = this.detectTool('kiro');
    if (kiro.available) {
      tools.push({ name: 'Kiro', ...kiro, available: true });
    }

    // Claude Code
    const claude = this.detectTool('claude');
    if (claude.available) {
      tools.push({ name: 'Claude Code', ...claude, available: true });
    }

    // npm
    const npm = this.detectTool('npm');
    if (npm.available) {
      tools.push({ name: 'npm', ...npm, available: true });
    }

    // yarn
    const yarn = this.detectTool('yarn');
    if (yarn.available) {
      tools.push({ name: 'yarn', ...yarn, available: true });
    }

    return tools;
  }

  /**
   * Detect a single tool by command name
   * @param command Command name to check
   * @param checkVersion Whether to query command version (default true)
   * @returns Tool detection result
   */
  private detectTool(command: string, checkVersion: boolean = true): Partial<DetectedTool> {
    try {
      const commandPath = this.getCommandPath(command);
      if (!commandPath) {
        return { available: false };
      }

      const version = checkVersion ? this.getVersion(command) : undefined;

      return {
        path: commandPath,
        available: true,
        version
      };
    } catch (error) {
      return { available: false };
    }
  }

  /**
   * Detect installed editors present as local program folders rather than
   * resolved globally via PATH.
   */
  private detectEditorsFromLocalPrograms(): DetectedTool[] {
    if (os.platform() !== 'win32') {
      return [];
    }

    const programsRoot = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs');
    if (!fs.existsSync(programsRoot)) {
      return [];
    }

    const definitions = [
      { folder: 'Microsoft VS Code', name: 'VS Code', executable: 'Code.exe', command: 'code' },
      { folder: 'Cursor', name: 'Cursor', executable: 'Cursor.exe', command: 'cursor' },
      { folder: 'Sublime Text', name: 'Sublime Text', executable: 'sublime_text.exe', command: 'subl' },
      { folder: 'Kiro', name: 'Kiro', executable: 'Kiro.exe', command: 'kiro' },
      { folder: 'Antigravity', name: 'Antigravity', executable: 'Antigravity.exe', command: 'antigravity' },
      { folder: 'Antigravity IDE', name: 'Antigravity IDE', executable: 'Antigravity IDE.exe', command: 'antigravity-ide' },
    ];

    const found: DetectedTool[] = [];

    for (const def of definitions) {
      const folderPath = path.join(programsRoot, def.folder);
      const exePath = path.join(folderPath, def.executable);
      if (fs.existsSync(exePath)) {
        found.push({
          name: def.name,
          path: exePath,
          available: true
        });
      }
    }

    return found;
  }

  /**
   * Resolve absolute path of command
   * @param command Command name to check
   * @returns Executable path or undefined
   */
  private getCommandPath(command: string): string | undefined {
    try {
      const checkCommand = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
      const output = execSync(checkCommand, { timeout: this.TIMEOUT_MS, stdio: 'pipe', encoding: 'utf-8' }).trim();
      return output ? output.split(/\r?\n/)[0].trim() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check if a command exists on the system
   * @param command Command name to check
   * @returns true if command exists, false otherwise
   */
  private checkCommandExists(command: string): boolean {
    return this.getCommandPath(command) !== undefined;
  }

  /**
   * Get version of a command
   * @param command Command name
   * @returns Version string or undefined
   */
  private getVersion(command: string): string | undefined {
    try {
      // Try common version flags
      const versionFlags = ['--version', '-v', '-V'];

      for (const flag of versionFlags) {
        try {
          const output = execSync(`${command} ${flag}`, { 
            timeout: this.TIMEOUT_MS, 
            stdio: 'pipe',
            encoding: 'utf-8'
          }).trim();

          if (output) {
            // Extract version number from output
            return this.parseVersion(output);
          }
        } catch (err: any) {
          // If execution timed out, abort subsequent flags to prevent blocking
          if (err && (err.code === 'ETIMEDOUT' || err.killed)) {
            break;
          }
          continue;
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Parse version from command output
   * @param output Command output
   * @returns Parsed version string
   */
  private parseVersion(output: string): string {
    // Extract first version-like pattern (e.g., "1.0.0", "v1.0.0")
    const versionMatch = output.match(/v?(\d+(?:\.\d+)*)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // Return first line if no version pattern found
    return output.split('\n')[0];
  }
}
