import * as blessed from 'blessed';
import { ScreenManager } from '../../infrastructure/ui/ScreenManager';
import { DetailedProject } from '../../infrastructure/repositories/QueryBuilder';

export class ProjectListView {
  private list: blessed.Widgets.ListElement;
  private screenManager: ScreenManager;
  private projects: DetailedProject[] = [];

  constructor(parent: blessed.Widgets.Node) {
    this.screenManager = ScreenManager.getInstance();

    this.list = blessed.list({
      parent,
      top: 0,
      left: 0,
      width: '45%',
      height: '100%',
      border: {
        type: 'line'
      },
      padding: {
        left: 1,
        right: 1
      },
      style: {
        bg: 'black',
        fg: 'white',
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        border: {
          fg: 'cyan',
          bg: 'black'
        }
      },
      keys: true,
      vi: true,
      interactive: true,
      label: ' Projects ',
      tags: true,
      scrollbar: {
        ch: ' '
      }
    });
  }

  public setProjects(projects: DetailedProject[]): void {
    this.projects = projects;
    
    const items = projects.map(p => {
      let label = p.name;
      if (p.is_favorite) label = `★ ${label}`;
      const techStack = p.technologies.slice(0, 3).map(t => t.name).join(' | ');
      return `${label}\n  {gray-fg}${techStack || 'No tech detected'}{/gray-fg}`;
    });

    this.list.setItems(items as any);
    this.screenManager.render();
  }

  public onSelect(callback: (project: DetailedProject) => void): void {
    this.list.on('select', (item: any, index: number) => {
      if (this.projects[index]) {
        callback(this.projects[index]);
      }
    });

    this.list.key(['d', 'D'], () => {
      const selectedIndex = (this.list as any).selected;
      if (this.projects[selectedIndex]) {
        callback(this.projects[selectedIndex]);
      }
    });
  }

  public getCurrentSelectedProject(): DetailedProject | null {
    const selectedIndex = (this.list as any).selected;
    if (selectedIndex !== undefined && selectedIndex !== null && selectedIndex >= 0 && this.projects[selectedIndex]) {
      return this.projects[selectedIndex];
    }
    return null;
  }

  public get selected(): number {
    return (this.list as any).selected;
  }

  public select(index: number): void {
    (this.list as any).select(index);
    this.screenManager.render();
  }

  public focus(): void {
    this.list.focus();
  }
}
