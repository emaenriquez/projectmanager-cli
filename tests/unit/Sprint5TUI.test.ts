import * as blessed from 'blessed';
import { ProjectListView } from '../../src/ui/components/ProjectListView';
import { DetailedProject } from '../../src/infrastructure/repositories/QueryBuilder';
import { TUIApplication } from '../../src/ui/tui/TUIApplication';
import { ScreenManager } from '../../src/infrastructure/ui/ScreenManager';
import { DatabaseConnection } from '../../src/infrastructure/database/DatabaseConnection';
import { ProjectRepository } from '../../src/infrastructure/repositories/ProjectRepository';
import { TagProjectUseCase } from '../../src/application/use_cases/TagProjectUseCase';
import { OpenProjectUseCase } from '../../src/application/use_cases/OpenProjectUseCase';
import { RemoveProjectUseCase } from '../../src/application/use_cases/RemoveProjectUseCase';

describe('Sprint 5 TUI Features', () => {
  let screen: blessed.Widgets.Screen;

  beforeEach(() => {
    screen = blessed.screen({
      smartCSR: false,
      dump: false
    });
  });

  afterEach(() => {
    screen.destroy();
  });

  describe('ProjectListView - Sprint 5 extensions', () => {
    const mockProjects: DetailedProject[] = [
      {
        id: '1',
        name: 'Project Alpha',
        path: '/path/alpha',
        created_at: new Date().toISOString(),
        last_opened: null,
        is_favorite: false,
        technologies: [{ id: 't1', project_id: '1', name: 'TypeScript', version: null, category: 'Language' }],
        tags: []
      },
      {
        id: '2',
        name: 'Project Beta',
        path: '/path/beta',
        created_at: new Date().toISOString(),
        last_opened: null,
        is_favorite: true,
        technologies: [{ id: 't2', project_id: '2', name: 'React', version: null, category: 'Framework' }],
        tags: [{ id: 'g1', name: 'frontend', created_at: new Date().toISOString() }]
      }
    ];

    it('should return null from getCurrentSelectedProject when no projects loaded', () => {
      const listView = new ProjectListView(screen);
      expect(listView.getCurrentSelectedProject()).toBeNull();
    });

    it('should return currently selected project and selected index', () => {
      const listView = new ProjectListView(screen);
      listView.setProjects(mockProjects);

      expect(listView.selected).toBe(0);
      const selected = listView.getCurrentSelectedProject();
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('1');
      expect(selected?.name).toBe('Project Alpha');
    });

    it('should allow selecting another project and update getCurrentSelectedProject', () => {
      const listView = new ProjectListView(screen);
      listView.setProjects(mockProjects);

      listView.select(1);
      expect(listView.selected).toBe(1);
      const selected = listView.getCurrentSelectedProject();
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('2');
      expect(selected?.name).toBe('Project Beta');
    });

    it('should format favorite projects with a star in items', () => {
      const listView = new ProjectListView(screen);
      listView.setProjects(mockProjects);

      const items = (listView as any).list.items;
      expect(items.length).toBe(2);
      expect(items[0].getText()).toContain('Project Alpha');
      expect(items[1].getText()).toContain('★ Project Beta');
    });
  });

  describe('TUIApplication key bindings and features', () => {
    let app: TUIApplication;

    beforeEach(() => {
      (ScreenManager as any).instance = null;
      app = new TUIApplication();
    });

    it('should render a split project layout with a cyan project list and a dark detail panel', () => {
      const list = (app as any).projectListView.list;
      const detail = (app as any).detailsPanel.box;

      expect(list.left).toBe(0);
      expect(list.width).toBeGreaterThan(30);
      expect(list.style.border.fg).toBe('cyan');

      expect(detail.left).toBeGreaterThan(0);
      expect(detail.width).toBeGreaterThan(30);
      expect(detail.style.border.fg).toBe('green');
    });

    it('should contain all Sprint 5 shortcuts in help bar', () => {
      const requiredHelpText = '↑/↓: Navigate | Enter/D: Details | A: Add | S: Scan | F: Search | *: Fav | T: Tag | O: Open | X: Del | Q: Quit';
      const screenInstance = (app as any).screenManager.getScreen();
      const helpBox = screenInstance.children.find((c: any) => c.getText && c.getText().includes('Navigate'));
      expect(helpBox).toBeDefined();
      const rawContent = (helpBox as any).content || helpBox.getText();
      const plainText = rawContent.replace(/\{[^}]+\}/g, '').trim();
      expect(plainText).toBe(requiredHelpText);
    });

    it('should have registered key handlers on the screen', () => {
      const screenInstance = (app as any).screenManager.getScreen();
      const events = screenInstance.eventNames ? screenInstance.eventNames() : [];
      
      // Check for key events
      expect(screenInstance.listeners('key f').length).toBeGreaterThan(0);
      expect(screenInstance.listeners('key *').length).toBeGreaterThan(0);
      expect(screenInstance.listeners('key t').length).toBeGreaterThan(0);
      expect(screenInstance.listeners('key o').length).toBeGreaterThan(0);
      expect(screenInstance.listeners('key x').length).toBeGreaterThan(0);
      expect(screenInstance.listeners('key q').length).toBeGreaterThan(0);
    });

    it('should filter projects array in real-time case-insensitively during search', () => {
      const mockProjects: DetailedProject[] = [
        {
          id: '1',
          name: 'Awesome Backend',
          path: '/path/backend',
          created_at: new Date().toISOString(),
          last_opened: null,
          is_favorite: false,
          technologies: [],
          tags: []
        },
        {
          id: '2',
          name: 'React Frontend',
          path: '/path/frontend',
          created_at: new Date().toISOString(),
          last_opened: null,
          is_favorite: false,
          technologies: [],
          tags: []
        },
        {
          id: '3',
          name: 'Mobile App',
          path: '/path/mobile',
          created_at: new Date().toISOString(),
          last_opened: null,
          is_favorite: false,
          technologies: [],
          tags: []
        }
      ];

      (app as any).allProjects = mockProjects;
      (app as any).currentProjects = mockProjects;
      (app as any).projectListView.setProjects(mockProjects);

      // Trigger search key
      const screenInstance = (app as any).screenManager.getScreen();
      screenInstance.emit('key f', 'f', { name: 'f', full: 'f' });

      // Check activeSearchBox was created
      const searchBox = screenInstance.children.find((c: any) => c.type === 'textbox');
      expect(searchBox).toBeDefined();

      // Type into searchBox
      searchBox.setValue('backend');
      searchBox.emit('keypress', '', { name: 'a', full: 'a' });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect((app as any).currentProjects.length).toBe(1);
          expect((app as any).currentProjects[0].name).toBe('Awesome Backend');

          // Test escape exits search mode and restores all projects
          searchBox.emit('keypress', '', { name: 'escape', full: 'escape' });
          setTimeout(() => {
            expect((app as any).currentProjects.length).toBe(3);
            resolve();
          }, 50);
        }, 50);
      });
    });

    it('should toggle favorite status when * is pressed', () => {
      const mockProject: DetailedProject = {
        id: 'p1',
        name: 'Fav Project',
        path: '/path/fav',
        created_at: new Date().toISOString(),
        last_opened: null,
        is_favorite: false,
        technologies: [],
        tags: []
      };

      (app as any).allProjects = [mockProject];
      (app as any).currentProjects = [mockProject];
      (app as any).projectListView.setProjects([mockProject]);

      const updateSpy = jest.spyOn(ProjectRepository.prototype, 'update').mockImplementation();
      const findByIdSpy = jest.spyOn(ProjectRepository.prototype, 'findById').mockReturnValue({
        id: 'p1',
        name: 'Fav Project',
        path: '/path/fav',
        created_at: new Date().toISOString(),
        last_opened: null,
        is_favorite: false
      });
      const runSpy = jest.spyOn(app, 'run').mockImplementation();

      const screenInstance = (app as any).screenManager.getScreen();
      screenInstance.emit('key *', '*', { name: '*', full: '*' });

      expect(findByIdSpy).toHaveBeenCalledWith('p1');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'p1',
          is_favorite: true
        })
      );
      expect(runSpy).toHaveBeenCalled();

      updateSpy.mockRestore();
      findByIdSpy.mockRestore();
      runSpy.mockRestore();
    });

    it('should open project when O is pressed', () => {
      const mockProject: DetailedProject = {
        id: 'p-open',
        name: 'Open Me',
        path: '/path/open',
        created_at: new Date().toISOString(),
        last_opened: null,
        is_favorite: false,
        technologies: [],
        tags: []
      };

      (app as any).allProjects = [mockProject];
      (app as any).currentProjects = [mockProject];
      (app as any).projectListView.setProjects([mockProject]);

      const executeSpy = jest.spyOn(OpenProjectUseCase.prototype, 'execute').mockImplementation();
      const showMessageSpy = jest.spyOn(app as any, 'showMessage').mockImplementation();

      const screenInstance = (app as any).screenManager.getScreen();
      screenInstance.emit('key o', 'o', { name: 'o', full: 'o' });

      // Find tool list if rendered and press enter
      const toolList = screenInstance.children.find((c: any) => c.type === 'list' && c !== (app as any).projectListView.list);
      if (toolList) {
        toolList.emit('key enter', 'enter', { name: 'enter' });
      }

      expect(executeSpy).toHaveBeenCalledWith('p-open', expect.anything());
      expect(showMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project Opened'),
        expect.stringContaining('Open Me'),
        expect.any(Function)
      );

      executeSpy.mockRestore();
      showMessageSpy.mockRestore();
    });

    it('should delete project when X is pressed and confirmed', () => {
      const mockProject: DetailedProject = {
        id: 'p-del',
        name: 'Delete Me',
        path: '/path/del',
        created_at: new Date().toISOString(),
        last_opened: null,
        is_favorite: false,
        technologies: [],
        tags: []
      };

      (app as any).allProjects = [mockProject];
      (app as any).currentProjects = [mockProject];
      (app as any).projectListView.setProjects([mockProject]);

      const executeSpy = jest.spyOn(RemoveProjectUseCase.prototype, 'execute').mockImplementation();
      const showMessageSpy = jest.spyOn(app as any, 'showMessage').mockImplementation();

      const screenInstance = (app as any).screenManager.getScreen();
      screenInstance.emit('key x', 'x', { name: 'x', full: 'x' });

      // Find question element
      const question = screenInstance.children.find((c: any) => c.type === 'question');
      expect(question).toBeDefined();

      // Emit yes on question
      (screenInstance.program as any).emit('keypress', 'y', { name: 'y', full: 'y' });

      expect(executeSpy).toHaveBeenCalledWith('p-del');
      expect(showMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleted'),
        expect.stringContaining('Delete Me removed.'),
        expect.any(Function)
      );

      executeSpy.mockRestore();
      showMessageSpy.mockRestore();
    });
  });
});


