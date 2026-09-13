import * as blessed from 'blessed';
import * as fs from 'fs';
import * as path from 'path';
import { ScreenManager } from '../../infrastructure/ui/ScreenManager';
import { DetailedProject } from '../../infrastructure/repositories/QueryBuilder';
import { GitService } from '../../domain/services/GitService';

const PROJECT_CONFIG_FILES = [
  'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
  'requirements.txt', 'pom.xml', 'build.gradle', 'Gemfile',
  'composer.json', 'setup.py', 'CMakeLists.txt'
];

interface SubProject {
  name: string;
  path: string;
  configFiles: string[];
}

export class DetailsPanel {
  private box: blessed.Widgets.BoxElement;
  private screenManager: ScreenManager;
  private gitService: GitService;

  constructor(parent: blessed.Widgets.Node) {
    this.screenManager = ScreenManager.getInstance();
    this.gitService = new GitService();

    this.box = blessed.box({
      parent,
      top: 0,
      left: '45%',
      width: '55%',
      height: '100%',
      border: {
        type: 'line'
      },
      padding: {
        left: 1,
        right: 1,
        top: 1,
        bottom: 1
      },
      style: {
        bg: 'black',
        fg: 'white',
        border: {
          fg: 'green',
          bg: 'black'
        }
      },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      label: ' Project Details '
    });
  }

  public setProject(project: DetailedProject | null): void {
    if (!project) {
      this.box.setContent('{gray-fg}Select a project to view details{/gray-fg}');
      this.screenManager.render();
      return;
    }

    let content = `{bold}${project.name}{/bold} ${project.is_favorite ? '{yellow-fg}★{/yellow-fg}' : ''}\n`;
    content += `{gray-fg}${project.path}{/gray-fg}\n\n`;

    content += `{bold}Timestamps{/bold}\n`;
    content += `Created: ${new Date(project.created_at).toLocaleString()}\n`;
    content += `Last Opened: ${project.last_opened ? new Date(project.last_opened).toLocaleString() : 'Never'}\n\n`;

    // Git status
    const gitStatus = this.gitService.getStatus(project.path);
    content += `{bold}Git{/bold}\n`;
    if (gitStatus.isGitRepo) {
      if (gitStatus.branch) content += `Branch: {cyan-fg}${gitStatus.branch}{/cyan-fg}\n`;
      if (gitStatus.uncommittedChanges > 0) {
        content += `{yellow-fg}⚠ ${gitStatus.uncommittedChanges} uncommitted changes{/yellow-fg}\n`;
      }
      if (gitStatus.unpushedCommits > 0) {
        content += `{yellow-fg}↑ ${gitStatus.unpushedCommits} unpushed commits{/yellow-fg}\n`;
      }
      if (gitStatus.uncommittedChanges === 0 && gitStatus.unpushedCommits === 0) {
        content += `{green-fg}✓ Clean{/green-fg}\n`;
      }
    } else {
      content += '{gray-fg}Not a git repository{/gray-fg}\n';
    }
    content += '\n';
    const subprojects = this.detectSubprojects(project.path);
    if (subprojects.length > 0) {
      content += `{bold}Subprojects (${subprojects.length}){/bold}\n`;
      for (const sub of subprojects) {
        content += `{cyan-fg}📁 ${sub.name}{/cyan-fg}\n`;
        content += `   ${sub.configFiles.join(', ')}\n`;
      }
      content += '\n';
    }

    content += `{bold}Technologies (${project.technologies.length}){/bold}\n`;
    if (project.technologies.length > 0) {
      project.technologies.forEach(t => {
        content += `- ${t.name} ${t.version ? `(v${t.version})` : ''} [${t.category}]\n`;
      });
    } else {
      content += '{gray-fg}No technologies detected{/gray-fg}\n';
    }
    content += '\n';

    content += `{bold}Tags (${project.tags.length}){/bold}\n`;
    if (project.tags.length > 0) {
      content += project.tags.map(t => `{cyan-bg}{black-fg} ${t.name} {/black-fg}{/cyan-bg}`).join(' ') + '\n';
    } else {
      content += '{gray-fg}No tags{/gray-fg}\n';
    }

    this.box.setContent(content);
    this.screenManager.render();
  }

  private detectSubprojects(projectPath: string): SubProject[] {
    const subprojects: SubProject[] = [];
    try {
      if (!fs.existsSync(projectPath)) return subprojects;
      const entries = fs.readdirSync(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        const subPath = path.join(projectPath, entry.name);
        const configFiles: string[] = [];
        
        try {
          const subFiles = fs.readdirSync(subPath).map(f => f.toLowerCase());
          for (const configFile of PROJECT_CONFIG_FILES) {
            if (subFiles.includes(configFile.toLowerCase())) {
              configFiles.push(configFile);
            }
          }
        } catch {
          continue;
        }
        
        if (configFiles.length > 0) {
          subprojects.push({
            name: entry.name,
            path: subPath,
            configFiles
          });
        }
      }
    } catch {
      // Ignore errors
    }
    return subprojects;
  }
}

