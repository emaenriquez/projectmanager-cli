import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitStatus {
  isGitRepo: boolean;
  branch: string | null;
  uncommittedChanges: number;
  unpushedCommits: number;
  hasRemote: boolean;
}

export class GitService {
  /**
   * Get git status for a project path
   */
  public getStatus(projectPath: string): GitStatus {
    const defaultStatus: GitStatus = {
      isGitRepo: false,
      branch: null,
      uncommittedChanges: 0,
      unpushedCommits: 0,
      hasRemote: false
    };

    if (!this.isGitRepository(projectPath)) {
      return defaultStatus;
    }

    defaultStatus.isGitRepo = true;

    try {
      defaultStatus.branch = this.getCurrentBranch(projectPath);
      defaultStatus.uncommittedChanges = this.getUncommittedChangesCount(projectPath);
      defaultStatus.hasRemote = this.hasRemote(projectPath);
      if (defaultStatus.hasRemote) {
        defaultStatus.unpushedCommits = this.getUnpushedCommitsCount(projectPath);
      }
    } catch {
      // If any git command fails, return what we have
    }

    return defaultStatus;
  }

  private isGitRepository(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, '.git'));
  }

  private getCurrentBranch(projectPath: string): string | null {
    try {
      const result = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.trim();
    } catch {
      return null;
    }
  }

  private getUncommittedChangesCount(projectPath: string): number {
    try {
      const result = execSync('git status --porcelain', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const lines = result.trim().split('\n').filter(l => l.length > 0);
      return lines.length;
    } catch {
      return 0;
    }
  }

  private hasRemote(projectPath: string): boolean {
    try {
      const result = execSync('git remote', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  private getUnpushedCommitsCount(projectPath: string): number {
    try {
      const result = execSync('git log @{u}..HEAD --oneline 2>nul', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
        shell: true as any,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const lines = result.trim().split('\n').filter(l => l.length > 0);
      return lines.length;
    } catch {
      return 0;
    }
  }

  /**
   * Format git status for display
   */
  public formatStatus(status: GitStatus): string {
    if (!status.isGitRepo) {
      return 'Not a git repository';
    }

    const parts: string[] = [];
    if (status.branch) {
      parts.push(`Branch: ${status.branch}`);
    }
    if (status.uncommittedChanges > 0) {
      parts.push(`⚠ ${status.uncommittedChanges} uncommitted changes`);
    }
    if (status.unpushedCommits > 0) {
      parts.push(`↑ ${status.unpushedCommits} unpushed commits`);
    }
    if (parts.length === 1 && status.branch) {
      parts.push('✓ Clean');
    }

    return parts.join('\n');
  }
}
