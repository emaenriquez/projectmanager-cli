import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UIState {
  selectedProjectId: string | null;
  sortOrder: 'name' | 'created_at' | 'last_opened';
  sortDirection: 'ASC' | 'DESC';
  filters: {
    name?: string;
    is_favorite?: boolean;
    tags?: string[];
    technologies?: string[];
  };
}

const DEFAULT_STATE: UIState = {
  selectedProjectId: null,
  sortOrder: 'name',
  sortDirection: 'ASC',
  filters: {}
};

export type StateListener = (state: UIState) => void;

export class StateManager {
  private state: UIState;
  private listeners: Set<StateListener> = new Set();
  private stateFilePath: string;

  constructor() {
    const homeDir = os.homedir();
    const projectHubDir = path.join(homeDir, '.project-hub');
    this.stateFilePath = path.join(projectHubDir, 'state.json');
    this.state = this.loadState();
  }

  public getState(): UIState {
    return { ...this.state };
  }

  public updateState(partialState: Partial<UIState>): void {
    this.state = {
      ...this.state,
      ...partialState,
      filters: {
        ...this.state.filters,
        ...(partialState.filters || {})
      }
    };
    
    this.notifyListeners();
    this.saveState();
  }

  public resetState(): void {
    this.state = { ...DEFAULT_STATE };
    this.notifyListeners();
    this.saveState();
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  private loadState(): UIState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (error) {
      // Ignore read errors and return default
    }
    return { ...DEFAULT_STATE };
  }

  private saveState(): void {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      // Ignore write errors
    }
  }
}
