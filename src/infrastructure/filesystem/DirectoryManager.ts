import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * DirectoryManager handles the creation and initialization of application directories.
 * Manages directory structure for Project Hub, including logs and database directories.
 */
export class DirectoryManager {
  private readonly appDir: string;
  private readonly logsDir: string;
  private readonly dbDir: string;

  constructor() {
    const homeDir = os.homedir();
    this.appDir = path.join(homeDir, '.project-hub');
    this.logsDir = path.join(this.appDir, 'logs');
    this.dbDir = path.join(this.appDir, 'db');
  }

  /**
   * Initializes the application directory structure.
   * Creates ~/.project-hub/, ~/.project-hub/logs/, and ~/.project-hub/db/ directories.
   * Sets appropriate permissions (700 on Unix systems).
   *
   * @throws Error if directory creation fails
   */
  public initializeAppDirectories(): void {
    try {
      this.ensureDirectoryExists(this.appDir);
      this.ensureDirectoryExists(this.logsDir);
      this.ensureDirectoryExists(this.dbDir);

      // Set permissions to 700 (rwx------) on Unix systems (Windows ignores this)
      this.setDirectoryPermissions(this.appDir);
      this.setDirectoryPermissions(this.logsDir);
      this.setDirectoryPermissions(this.dbDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize application directories: ${message}`);
    }
  }

  /**
   * Returns the application directory path.
   */
  public getAppDir(): string {
    return this.appDir;
  }

  /**
   * Returns the logs directory path.
   */
  public getLogsDir(): string {
    return this.logsDir;
  }

  /**
   * Returns the database directory path.
   */
  public getDbDir(): string {
    return this.dbDir;
  }

  /**
   * Ensures a directory exists. Creates it if it doesn't.
   *
   * @param dirPath - Path to the directory
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Sets directory permissions to 700 (rwx------) on Unix systems.
   * On Windows, this operation is silently ignored as Windows uses ACLs instead.
   *
   * @param dirPath - Path to the directory
   */
  private setDirectoryPermissions(dirPath: string): void {
    // Only set permissions on Unix-like systems
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(dirPath, 0o700);
      } catch (error) {
        // Log but don't throw - permissions might fail on some filesystems
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not set directory permissions for ${dirPath}: ${message}`);
      }
    }
  }

  /**
   * Verifies that all required directories exist and have correct permissions.
   *
   * @returns true if all directories exist and are accessible
   */
  public verifyDirectoriesExist(): boolean {
    try {
      const directories = [this.appDir, this.logsDir, this.dbDir];
      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          return false;
        }
        // Verify read/write access
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}
