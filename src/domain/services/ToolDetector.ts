import { execSync } from 'child_process';
import * as os from 'os';

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
   * Checks PATH for: VS Code, Cursor, Sublime Text, Neovim, Vim
   */
  public detectEditors(): DetectedTool[] {
    const editors: DetectedTool[] = [];

    // VS Code
    const vsCode = this.detectTool('code');
    if (vsCode.available) {
      editors.push({ name: 'VS Code', ...vsCode, available: true });
    }

    // Cursor
    const cursor = this.detectTool('cursor');
    if (cursor.available) {
      editors.push({ name: 'Cursor', ...cursor, available: true });
    }

    // Sublime Text
    const sublime = this.detectTool('subl');
    if (sublime.available) {
      editors.push({ name: 'Sublime Text', ...sublime, available: true });
    }

    // Neovim
    const neovim = this.detectTool('nvim');
    if (neovim.available) {
      editors.push({ name: 'Neovim', ...neovim, available: true });
    }

    // Vim
    const vim = this.detectTool('vim');
    if (vim.available) {
      editors.push({ name: 'Vim', ...vim, available: true });
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
   * @returns Tool detection result
   */
  private detectTool(command: string): Partial<DetectedTool> {
    try {
      // Check if command exists
      const commandExists = this.checkCommandExists(command);
      if (!commandExists) {
        return { available: false };
      }

      // Get version
      const version = this.getVersion(command);

      return {
        available: true,
        version
      };
    } catch (error) {
      return { available: false };
    }
  }

  /**
   * Check if a command exists on the system
   * @param command Command name to check
   * @returns true if command exists, false otherwise
   */
  private checkCommandExists(command: string): boolean {
    try {
      const checkCommand = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
      execSync(checkCommand, { timeout: this.TIMEOUT_MS, stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
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
        } catch (err) {
          // Try next flag
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
