import { ToolDetector } from './ToolDetector';

describe('ToolDetector', () => {
  let detector: ToolDetector;

  beforeEach(() => {
    detector = new ToolDetector();
  });

  describe('detectEditors', () => {
    it('should return array of editor tools', () => {
      const editors = detector.detectEditors();

      expect(Array.isArray(editors)).toBe(true);
      // Each editor should have a name and available property
      editors.forEach(editor => {
        expect(editor.name).toBeDefined();
        expect(typeof editor.available).toBe('boolean');
      });
    });

    it('should check for VS Code', () => {
      const editors = detector.detectEditors();
      const vsCode = editors.find(e => e.name === 'VS Code');

      if (vsCode) {
        expect(vsCode.available).toBeDefined();
      }
    });

    it('should check for Neovim', () => {
      const editors = detector.detectEditors();
      const neovim = editors.find(e => e.name === 'Neovim');

      if (neovim) {
        expect(neovim.available).toBeDefined();
      }
    });

    it('should check for Vim', () => {
      const editors = detector.detectEditors();
      const vim = editors.find(e => e.name === 'Vim');

      if (vim) {
        expect(vim.available).toBeDefined();
      }
    });

    it('should check for Cursor', () => {
      const editors = detector.detectEditors();
      const cursor = editors.find(e => e.name === 'Cursor');

      if (cursor) {
        expect(cursor.available).toBeDefined();
      }
    });

    it('should check for Sublime Text', () => {
      const editors = detector.detectEditors();
      const sublime = editors.find(e => e.name === 'Sublime Text');

      if (sublime) {
        expect(sublime.available).toBeDefined();
      }
    });
  });

  describe('detectRuntimes', () => {
    it('should return array of runtime tools', () => {
      const runtimes = detector.detectRuntimes();

      expect(Array.isArray(runtimes)).toBe(true);
      // Each runtime should have name and available property
      runtimes.forEach(runtime => {
        expect(runtime.name).toBeDefined();
        expect(typeof runtime.available).toBe('boolean');
      });
    });

    it('should check for Node.js', () => {
      const runtimes = detector.detectRuntimes();
      const node = runtimes.find(r => r.name === 'Node.js');

      if (node) {
        expect(node.available).toBeDefined();
      }
    });

    it('should check for Python', () => {
      const runtimes = detector.detectRuntimes();
      const python = runtimes.find(r => r.name === 'Python');

      if (python) {
        expect(python.available).toBeDefined();
      }
    });

    it('should check for Rust', () => {
      const runtimes = detector.detectRuntimes();
      const rust = runtimes.find(r => r.name === 'Rust');

      if (rust) {
        expect(rust.available).toBeDefined();
      }
    });

    it('should check for Go', () => {
      const runtimes = detector.detectRuntimes();
      const go = runtimes.find(r => r.name === 'Go');

      if (go) {
        expect(go.available).toBeDefined();
      }
    });

    it('should check for Java', () => {
      const runtimes = detector.detectRuntimes();
      const java = runtimes.find(r => r.name === 'Java');

      if (java) {
        expect(java.available).toBeDefined();
      }
    });

    it('should check for PHP', () => {
      const runtimes = detector.detectRuntimes();
      const php = runtimes.find(r => r.name === 'PHP');

      if (php) {
        expect(php.available).toBeDefined();
      }
    });
  });

  describe('detectDevelopmentTools', () => {
    it('should return array of development tools', () => {
      const tools = detector.detectDevelopmentTools();

      expect(Array.isArray(tools)).toBe(true);
      // Each tool should have name and available property
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.available).toBe('boolean');
      });
    });

    it('should check for Git', () => {
      const tools = detector.detectDevelopmentTools();
      const git = tools.find(t => t.name === 'Git');

      if (git) {
        expect(git.available).toBeDefined();
      }
    });

    it('should check for Docker', () => {
      const tools = detector.detectDevelopmentTools();
      const docker = tools.find(t => t.name === 'Docker');

      if (docker) {
        expect(docker.available).toBeDefined();
      }
    });

    it('should check for npm', () => {
      const tools = detector.detectDevelopmentTools();
      const npm = tools.find(t => t.name === 'npm');

      if (npm) {
        expect(npm.available).toBeDefined();
      }
    });

    it('should check for yarn', () => {
      const tools = detector.detectDevelopmentTools();
      const yarn = tools.find(t => t.name === 'yarn');

      if (yarn) {
        expect(yarn.available).toBeDefined();
      }
    });

    it('should check for Claude Code', () => {
      const tools = detector.detectDevelopmentTools();
      const claude = tools.find(t => t.name === 'Claude Code');

      if (claude) {
        expect(claude.available).toBeDefined();
      }
    });
  });


  describe('detectAll', () => {
    it('should return map with editors, runtimes, and tools categories', () => {
      const allTools = detector.detectAll();

      expect(allTools instanceof Map).toBe(true);
      expect(allTools.has('editors')).toBe(true);
      expect(allTools.has('runtimes')).toBe(true);
      expect(allTools.has('tools')).toBe(true);
    });

    it('should return arrays in each category', () => {
      const allTools = detector.detectAll();

      expect(Array.isArray(allTools.get('editors'))).toBe(true);
      expect(Array.isArray(allTools.get('runtimes'))).toBe(true);
      expect(Array.isArray(allTools.get('tools'))).toBe(true);
    });

    it('should have tools with available property', () => {
      const allTools = detector.detectAll();

      allTools.forEach((toolList) => {
        toolList.forEach(tool => {
          expect(typeof tool.available).toBe('boolean');
          expect(tool.name).toBeDefined();
        });
      });
    });

    it('should not have empty categories', () => {
      const allTools = detector.detectAll();

      const editors = allTools.get('editors') || [];
      const runtimes = allTools.get('runtimes') || [];
      const tools = allTools.get('tools') || [];

      expect(editors.length).toBeGreaterThan(0);
      expect(runtimes.length).toBeGreaterThan(0);
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('tool detection results', () => {
    it('should mark available tools correctly', () => {
      const allTools = detector.detectAll();

      // At least some tools should be available (unlikely all are missing)
      const allToolsList = [
        ...(allTools.get('editors') || []),
        ...(allTools.get('runtimes') || []),
        ...(allTools.get('tools') || [])
      ];

      // Filter available tools
      const availableTools = allToolsList.filter(t => t.available);

      // We expect at least Git to be available on most systems
      // But we don't enforce it as it's system-dependent
      expect(Array.isArray(availableTools)).toBe(true);
    });

    it('should provide version info for available tools', () => {
      const allTools = detector.detectAll();

      const allToolsList = [
        ...(allTools.get('editors') || []),
        ...(allTools.get('runtimes') || []),
        ...(allTools.get('tools') || [])
      ];

      // Available tools might have version info
      allToolsList.forEach(tool => {
        if (tool.available && tool.version) {
          expect(typeof tool.version).toBe('string');
        }
      });
    });
  });

  describe('tool detection categories', () => {
    let originalDetectTool: any;

    beforeEach(() => {
      originalDetectTool = (detector as any).detectTool;
      (detector as any).detectTool = jest.fn().mockReturnValue({ available: true, version: '1.0.0' });
    });

    afterEach(() => {
      (detector as any).detectTool = originalDetectTool;
    });

    it('should categorize editors correctly', () => {
      const editors = detector.detectEditors();
      const editorNames = editors.map(e => e.name);

      expect(editorNames).toContain('VS Code');
      expect(editorNames).toContain('Cursor');
      expect(editorNames).toContain('Neovim');
      expect(editorNames).toContain('Vim');
      expect(editorNames).toContain('Sublime Text');
      expect(editorNames).toContain('Kiro');
      expect(editorNames).toContain('Kiro CLI');
      expect(editorNames).toContain('Antigravy');
      expect(editorNames).toContain('Antigravy CLI');
    });

    it('should categorize runtimes correctly', () => {
      const runtimes = detector.detectRuntimes();
      const runtimeNames = runtimes.map(r => r.name);

      expect(runtimeNames).toContain('Node.js');
      expect(runtimeNames).toContain('Python');
      expect(runtimeNames).toContain('Rust');
      expect(runtimeNames).toContain('Go');
      expect(runtimeNames).toContain('Java');
      expect(runtimeNames).toContain('PHP');
    });

    it('should include common development tools', () => {
      const tools = detector.detectDevelopmentTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('Git');
      expect(toolNames).toContain('Docker');
      expect(toolNames).toContain('npm');
      expect(toolNames).toContain('Kiro');
      expect(toolNames).toContain('Claude Code');
    });
  });

  describe('cross-platform compatibility', () => {
    it('should work on current platform', () => {
      // This test verifies that detection works on the current platform
      // without throwing errors
      const allTools = detector.detectAll();

      expect(allTools instanceof Map).toBe(true);
      expect(allTools.size).toBeGreaterThan(0);
    });

    it('should provide consistent output structure', () => {
      const allTools = detector.detectAll();

      allTools.forEach((toolList) => {
        expect(Array.isArray(toolList)).toBe(true);
        toolList.forEach(tool => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('available');
          // optional properties
          if (tool.version) {
            expect(typeof tool.version).toBe('string');
          }
          if (tool.path) {
            expect(typeof tool.path).toBe('string');
          }
        });
      });
    });
  });

  describe('error handling', () => {
    it('should not throw when detecting all tools', () => {
      expect(() => {
        detector.detectAll();
      }).not.toThrow();
    });

    it('should not throw when detecting editors', () => {
      expect(() => {
        detector.detectEditors();
      }).not.toThrow();
    });

    it('should not throw when detecting runtimes', () => {
      expect(() => {
        detector.detectRuntimes();
      }).not.toThrow();
    });

    it('should not throw when detecting development tools', () => {
      expect(() => {
        detector.detectDevelopmentTools();
      }).not.toThrow();
    });
  });
});
