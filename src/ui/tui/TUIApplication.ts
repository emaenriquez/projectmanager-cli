import * as blessed from 'blessed';
import { ScreenManager } from '../../infrastructure/ui/ScreenManager';
import { ProjectListView } from '../components/ProjectListView';
import { DetailsPanel } from '../components/DetailsPanel';
import { ListProjectsUseCase } from '../../application/use_cases/ListProjectsUseCase';
import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { MigrationRunner } from '../../infrastructure/database/migrations/MigrationRunner';
import { getAllMigrations } from '../../infrastructure/database/migrations';
import { StateManager } from '../../application/state/StateManager';
import { DetailedProject } from '../../infrastructure/repositories/QueryBuilder';

export class TUIApplication {
  private screenManager: ScreenManager;
  private projectListView: ProjectListView;
  private detailsPanel: DetailsPanel;
  private listUseCase: ListProjectsUseCase;
  private stateManager: StateManager;
  private currentProjects: DetailedProject[] = [];
  private allProjects: DetailedProject[] = [];
  private isFiltered: boolean = false;

  constructor() {
    this.initDb();
    
    this.screenManager = ScreenManager.getInstance();
    const screen = this.screenManager.getScreen();

    // Prevent global escape exit so search mode and dialogs can handle Escape
    (screen as any).removeAllListeners('key escape');
    (screen as any).ignoreLocked = ((screen as any).ignoreLocked || []).filter((k: string) => k !== 'escape');

    // Create Main Container
    const container = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    this.projectListView = new ProjectListView(container);
    this.detailsPanel = new DetailsPanel(container);

    const helpBox = blessed.text({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' {bold}↑/↓{/bold}: Navigate | {bold}Enter/D{/bold}: Details | {bold}A{/bold}: Add | {bold}S{/bold}: Scan | {bold}F{/bold}: Search | {bold}*{/bold}: Fav | {bold}T{/bold}: Tag | {bold}O{/bold}: Open | {bold}X{/bold}: Del | {bold}Q{/bold}: Quit ',
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white'
      }
    });

    this.listUseCase = new ListProjectsUseCase();
    this.stateManager = new StateManager();

    this.setupEvents();
  }

  private initDb() {
    const db = DatabaseConnection.getInstance();
    if (!db.isConnected()) {
      db.open();
    }
    const migrationRunner = new MigrationRunner();
    migrationRunner.runPending(getAllMigrations());
  }

  private showMessage(label: string, text: string, callback?: () => void) {
    const msg = blessed.message({
      parent: this.screenManager.getScreen(),
      border: 'line',
      height: 'shrink',
      width: 'half',
      top: 'center',
      left: 'center',
      label: ` ${label} `,
      tags: true,
      keys: true,
      style: { bg: 'black', fg: 'white' }
    });
    msg.display(text, 0, () => {
      msg.destroy();
      if (callback) callback();
      else this.screenManager.render();
    });
  }

  private getSelectedProject(): DetailedProject | null {
    const project = this.projectListView.getCurrentSelectedProject();
    if (project) return project;
    const selectedIndex = (this.projectListView as any).selected ?? ((this.projectListView as any).list as any)?.selected;
    if (typeof selectedIndex === 'number' && selectedIndex >= 0 && this.currentProjects[selectedIndex]) {
      return this.currentProjects[selectedIndex];
    }
    return null;
  }

  private setupEvents() {
    this.projectListView.onSelect((project) => {
      this.detailsPanel.setProject(project);
    });

    this.screenManager.getScreen().key(['r', 'R'], () => {
      this.run(); // Reload list
    });

    this.screenManager.getScreen().key(['q', 'Q'], () => {
      process.exit(0);
    });

    this.screenManager.getScreen().key(['escape'], () => {
      if (this.isFiltered) {
        this.isFiltered = false;
        this.currentProjects = [...this.allProjects];
        this.projectListView.setProjects(this.allProjects);
        this.projectListView.focus();
        this.screenManager.render();
      }
    });

    // Add single project by path
    this.screenManager.getScreen().key(['a', 'A'], () => {
      const prompt = blessed.prompt({
        parent: this.screenManager.getScreen(),
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' {blue-fg}Add Project{/blue-fg} ',
        tags: true,
        keys: true,
        vi: true,
        style: { bg: 'black', fg: 'white' }
      });
      
      prompt.input('Enter project path:', '', (err, value) => {
        prompt.destroy();
        if (err || !value) {
          this.screenManager.render();
          return;
        }
        
        try {
          const { AddProjectUseCase } = require('../../application/use_cases/AddProjectUseCase');
          const addUseCase = new AddProjectUseCase();
          const project = addUseCase.execute(value);
          this.showMessage('{green-fg}Project Added{/green-fg}', `Added: ${project.name}\nPath: ${project.path}`, () => this.run());
        } catch (error: any) {
          this.showMessage('{red-fg}Error{/red-fg}', `Error: ${error.message}`);
        }
      });
    });

    // Scan directory for multiple projects
    this.screenManager.getScreen().key(['s', 'S'], () => {
      const prompt = blessed.prompt({
        parent: this.screenManager.getScreen(),
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' {blue-fg}Scan Directory{/blue-fg} ',
        tags: true,
        keys: true,
        vi: true,
        style: {
          bg: 'black',
          fg: 'white'
        }
      });
      
      prompt.input('Enter absolute path to scan:', '', (err, value) => {
        prompt.destroy();
        if (err || !value) {
          this.screenManager.render();
          return;
        }
        
        try {
          const { ScanProjectsUseCase } = require('../../application/use_cases/ScanProjectsUseCase');
          const scanner = new ScanProjectsUseCase();
          const result = scanner.execute(value);
          this.showMessage('{green-fg}Scan Complete{/green-fg}', `Scanned: ${result.scanned} dirs\nAdded: ${result.added} projects\nUpdated: ${result.updated} projects`, () => this.run());
        } catch (error: any) {
          this.showMessage('{red-fg}Error{/red-fg}', `Error: ${error.message}`);
        }
      });
    });

    // Search / Filter (F key)
    let activeSearchBox: blessed.Widgets.TextboxElement | null = null;
    this.screenManager.getScreen().key(['f', 'F'], () => {
      if (activeSearchBox) return;

      const initialProjects = [...this.allProjects];

      const searchBox = blessed.textbox({
        parent: this.screenManager.getScreen(),
        border: 'line',
        height: 3,
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' {blue-fg}Search Projects (Esc to exit){/blue-fg} ',
        tags: true,
        keys: true,
        inputOnFocus: true,
        style: {
          bg: 'black',
          fg: 'white'
        }
      });
      activeSearchBox = searchBox;

      let isClosed = false;
      const exitSearch = (restore: boolean) => {
        if (isClosed) return;
        isClosed = true;
        activeSearchBox = null;
        searchBox.destroy();
        if (restore) {
          this.isFiltered = false;
          this.currentProjects = [...initialProjects];
          this.projectListView.setProjects(this.currentProjects);
        } else {
          this.isFiltered = true;
        }
        this.projectListView.focus();
        this.screenManager.render();
      };

      searchBox.on('keypress', (_ch, key) => {
        if (key && key.name === 'escape') {
          exitSearch(true);
          return;
        }

        setImmediate(() => {
          if (isClosed) return;
          const query = (searchBox.value || '').trim().toLowerCase();
          const filtered = initialProjects.filter(p =>
            p.name.toLowerCase().includes(query)
          );
          this.currentProjects = filtered;
          this.projectListView.setProjects(filtered);
          this.screenManager.render();
        });
      });

      searchBox.readInput((err, value) => {
        if (err || value === undefined || value === null) {
          exitSearch(true);
        } else {
          exitSearch(false);
        }
      });
    });

    // Favorites (Star key '*')
    this.screenManager.getScreen().key(['*', 'S-8'], () => {
      const selectedProject = this.getSelectedProject();
      if (!selectedProject) return;

      try {
        const { ProjectRepository } = require('../../infrastructure/repositories/ProjectRepository');
        const projectRepo = new ProjectRepository();
        const project = projectRepo.findById(selectedProject.id);
        if (project) {
          project.is_favorite = !project.is_favorite;
          projectRepo.update(project);

          const selectedIndex = (this.projectListView as any).selected ?? ((this.projectListView as any).list as any)?.selected;
          this.run();
          if (typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < this.currentProjects.length) {
            (this.projectListView as any).select(selectedIndex);
            const updated = this.getSelectedProject();
            if (updated) {
              this.detailsPanel.setProject(updated);
            }
          }
        }
      } catch (error: any) {
        this.showMessage('{red-fg}Error{/red-fg}', `Error toggling favorite: ${error.message}`);
      }
    });

    // Tags (T key)
    this.screenManager.getScreen().key(['t', 'T'], () => {
      const selectedProject = this.getSelectedProject();
      if (!selectedProject) return;

      const prompt = blessed.prompt({
        parent: this.screenManager.getScreen(),
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' {blue-fg}Add Tag{/blue-fg} ',
        tags: true,
        keys: true,
        vi: true,
        style: {
          bg: 'black',
          fg: 'white'
        }
      });

      prompt.input(`Enter tag name for ${selectedProject.name}:`, '', (err, value) => {
        prompt.destroy();
        if (err || !value || !value.trim()) {
          this.screenManager.render();
          return;
        }

        try {
          const { TagProjectUseCase } = require('../../application/use_cases/TagProjectUseCase');
          const tagUseCase = new TagProjectUseCase();
          tagUseCase.addTag(selectedProject.id, value.trim());
          const selectedIndex = (this.projectListView as any).selected ?? ((this.projectListView as any).list as any)?.selected;
          this.run();
          if (typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < this.currentProjects.length) {
            (this.projectListView as any).select(selectedIndex);
            const updated = this.getSelectedProject();
            if (updated) {
              this.detailsPanel.setProject(updated);
            }
          }
        } catch (error: any) {
          this.showMessage('{red-fg}Error{/red-fg}', `Error adding tag: ${error.message}`);
        }
      });
    });

    // Open project (O key)
    this.screenManager.getScreen().key(['o', 'O'], () => {
      const selectedProject = this.getSelectedProject();
      if (!selectedProject) return;

      const { ToolDetector } = require('../../domain/services/ToolDetector');
      const toolDetector = new ToolDetector();
      const detectedEditors = toolDetector.detectEditors();

      // Complete list of known supported tools
      const allKnownTools: string[] = [
        'VS Code',
        'Cursor',
        'Sublime Text',
        'Neovim',
        'Vim',
        'Kiro',
        'Antigravity IDE',
        'Antigravity',
        'System Default'
      ];

      // Build options list: detected tools first, followed by remaining known tools
      const detectedNames = detectedEditors.map((e: { name: string }) => e.name);
      const combinedToolNames: string[] = [...detectedNames];

      for (const tool of allKnownTools) {
        if (!combinedToolNames.some(existing => existing.toLowerCase() === tool.toLowerCase())) {
          combinedToolNames.push(tool);
        }
      }

      // Format items with clear indicators
      const toolItems = combinedToolNames.map((name: string) => {
        const isDetected = detectedNames.some((d: string) => d.toLowerCase() === name.toLowerCase());
        if (name === 'System Default') {
          return {
            label: `{cyan-fg}◆ System Default{/cyan-fg} (File Explorer)`,
            tool: 'System Default'
          };
        }
        if (isDetected) {
          return {
            label: `{green-fg}● ${name}{/green-fg}`,
            tool: name
          };
        }
        return {
          label: `  ${name}`,
          tool: name
        };
      });

      // Calculate explicit height to show all tools without clipping
      const listHeight = Math.min(toolItems.length + 2, 14);

      const editorList = blessed.list({
        parent: this.screenManager.getScreen(),
        border: 'line',
        height: listHeight,
        width: '50%',
        top: 'center',
        left: 'center',
        label: ' {bold}{blue-fg} Choose Tool / Editor {/blue-fg}{/bold} ',
        tags: true,
        keys: true,
        vi: true,
        mouse: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
          ch: ' ',
          track: {
            bg: 'black'
          },
          style: {
            inverse: true
          }
        },
        items: toolItems.map(item => item.label),
        selectedBg: 'blue',
        selectedFg: 'white',
        style: {
          bg: 'black',
          fg: 'white',
          border: {
            fg: 'cyan'
          },
          selected: {
            bg: 'blue',
            fg: 'white',
            bold: true
          }
        }
      });

      const closeEditorList = () => {
        editorList.destroy();
        this.screenManager.render();
      };

      editorList.on('select item', () => {
        this.screenManager.render();
      });

      editorList.key(['escape'], () => closeEditorList());
      editorList.key(['enter'], () => {
        const selectedIndex = (editorList as any).selected ?? 0;
        const selectedTool = toolItems[selectedIndex]?.tool || combinedToolNames[0] || 'VS Code';
        closeEditorList();
        try {
          const { OpenProjectUseCase } = require('../../application/use_cases/OpenProjectUseCase');
          const openUseCase = new OpenProjectUseCase();
          openUseCase.execute(selectedProject.id, selectedTool);
          this.showMessage('{green-fg}Project Opened{/green-fg}', `Opened ${selectedProject.name} with ${selectedTool}`, () => this.run());
        } catch (error: any) {
          this.showMessage('{red-fg}Error{/red-fg}', `Error opening project: ${error.message}`);
        }
      });

      editorList.focus();
      editorList.select(0);
      this.screenManager.render();
    });

    // Delete project
    this.screenManager.getScreen().key(['x', 'X'], () => {
      const selectedProject = this.projectListView.getCurrentSelectedProject();
      if (!selectedProject) return;

      const prompt = blessed.question({
        parent: this.screenManager.getScreen(),
        border: 'line',
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' {red-fg}Confirm Delete{/red-fg} ',
        tags: true,
        keys: true,
        vi: true,
        style: { bg: 'black', fg: 'white' }
      });
      
      prompt.ask(`Remove ${selectedProject.name} from Project Hub?`, (err, value) => {
        prompt.destroy();
        if (value) {
          try {
            const { RemoveProjectUseCase } = require('../../application/use_cases/RemoveProjectUseCase');
            const removeUseCase = new RemoveProjectUseCase();
            removeUseCase.execute(selectedProject.id);
            this.showMessage('{green-fg}Deleted{/green-fg}', `${selectedProject.name} removed.`, () => {
              this.run();
            });
          } catch (error: any) {
            this.showMessage('{red-fg}Error{/red-fg}', `Error: ${error.message}`);
          }
        } else {
          this.screenManager.render();
        }
      });
    });

    // Git Menu
    this.screenManager.getScreen().key(['g', 'G'], () => {
      const selectedProject = this.projectListView.getCurrentSelectedProject();
      if (!selectedProject) return;

      const { GitService } = require('../../domain/services/GitService');
      const git = new GitService();
      const status = git.getStatus(selectedProject.path);

      if (!status.isGitRepo) {
        this.showMessage('{yellow-fg}Git{/yellow-fg}', 'Not a git repository.');
        return;
      }

      this.showMessage('{cyan-fg}Git Status{/cyan-fg}', git.formatStatus(status));
    });
  }

  public run() {
    const state = this.stateManager.getState();
    const projects = this.listUseCase.execute({
      sort: state.sortOrder,
      order: state.sortDirection,
      ...state.filters
    });
    
    this.allProjects = projects;
    this.currentProjects = projects;
    this.isFiltered = false;
    this.projectListView.setProjects(projects);
    this.detailsPanel.setProject(null);
    this.projectListView.focus();

    this.screenManager.render();
  }
}

