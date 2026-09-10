import * as blessed from 'blessed';

export class ScreenManager {
  private static instance: ScreenManager;
  private screen: blessed.Widgets.Screen;

  private constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Project Hub',
      fullUnicode: true,
      dockBorders: true,
      ignoreLocked: ['C-c', 'escape']
    });

    // Handle global exit
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });
  }

  public static getInstance(): ScreenManager {
    if (!ScreenManager.instance) {
      ScreenManager.instance = new ScreenManager();
    }
    return ScreenManager.instance;
  }

  public getScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  public render(): void {
    this.screen.render();
  }

  public destroy(): void {
    this.screen.destroy();
  }
}
