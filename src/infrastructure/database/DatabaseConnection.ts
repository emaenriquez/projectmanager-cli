import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * DatabaseConnection manages SQLite database connectivity for Project Hub
 * Implements connection pooling and provides core database operations
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database | null = null;
  private dbPath: string;
  private connectionPool: Database.Database[] = [];
  private poolSize: number = 5;
  private isOpen: boolean = false;

  private constructor() {
    // Expand home directory and create path to projects.db
    const homeDir = os.homedir();
    const projectHubDir = path.join(homeDir, '.project-hub');
    this.dbPath = path.join(projectHubDir, 'projects.db');
  }

  /**
   * Get singleton instance of DatabaseConnection
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Reset instance for testing purposes
   */
  public static resetInstanceForTesting(): void {
    if (DatabaseConnection.instance && DatabaseConnection.instance.isOpen) {
      DatabaseConnection.instance.close();
    }
    DatabaseConnection.instance = undefined as any;
  }

  /**
   * Set database path for testing
   */
  public setTestDatabasePath(dbPath: string): void {
    if (this.isOpen) {
      this.close();
    }
    this.dbPath = dbPath;
  }

  /**
   * Open database connection
   * Creates directory structure if it doesn't exist
   * Initializes connection pool
   */
  public open(): void {
    try {
      if (this.isOpen && this.db) {
        return;
      }

      // Ensure ~/.project-hub directory exists
      const homeDir = os.homedir();
      const projectHubDir = path.join(homeDir, '.project-hub');
      
      if (!fs.existsSync(projectHubDir)) {
        fs.mkdirSync(projectHubDir, { recursive: true });
      }

      // Create logs directory for future use
      const logsDir = path.join(projectHubDir, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Open main database connection
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Set journal mode for better concurrent access
      this.db.pragma('journal_mode = WAL');

      // Initialize connection pool
      this.initializeConnectionPool();

      this.isOpen = true;
    } catch (error) {
      throw new Error(`Failed to open database at ${this.dbPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize connection pool for concurrent operations
   */
  private initializeConnectionPool(): void {
    try {
      for (let i = 0; i < this.poolSize; i++) {
        const poolDb = new Database(this.dbPath);
        poolDb.pragma('foreign_keys = ON');
        this.connectionPool.push(poolDb);
      }
    } catch (error) {
      throw new Error(`Failed to initialize connection pool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a connection from the pool
   */
  private getPoolConnection(): Database.Database {
    if (this.connectionPool.length === 0) {
      // Create a new connection if pool is exhausted
      const newDb = new Database(this.dbPath);
      newDb.pragma('foreign_keys = ON');
      return newDb;
    }
    const db = this.connectionPool.pop();
    if (!db) {
      throw new Error('Failed to retrieve connection from pool');
    }
    return db;
  }

  /**
   * Return a connection to the pool
   */
  private returnPoolConnection(db: Database.Database): void {
    if (this.connectionPool.length < this.poolSize) {
      this.connectionPool.push(db);
    } else {
      db.close();
    }
  }

  /**
   * Close database connection and clean up resources
   */
  public close(): void {
    try {
      // Close all pooled connections
      for (const poolDb of this.connectionPool) {
        try {
          poolDb.close();
        } catch (err) {
          // Ignore errors during pool cleanup
        }
      }
      this.connectionPool = [];

      // Close main connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      this.isOpen = false;
    } catch (error) {
      throw new Error(`Failed to close database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a SQL statement without returning results
   * Used for INSERT, UPDATE, DELETE operations
   */
  public execute(sql: string, params?: any[]): void {
    this.ensureOpen();
    
    try {
      if (!this.db) {
        throw new Error('Database connection is not initialized');
      }

      const stmt = this.db.prepare(sql);
      if (params && params.length > 0) {
        stmt.run(...params);
      } else {
        stmt.run();
      }
    } catch (error) {
      throw new Error(`Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prepare a SQL statement for reuse
   * Returns a prepared statement object
   */
  public prepare(sql: string): Database.Statement {
    this.ensureOpen();
    
    try {
      if (!this.db) {
        throw new Error('Database connection is not initialized');
      }

      return this.db.prepare(sql);
    } catch (error) {
      throw new Error(`Failed to prepare statement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a SELECT query and return all results
   */
  public query<T = any>(sql: string, params?: any[]): T[] {
    this.ensureOpen();
    
    try {
      if (!this.db) {
        throw new Error('Database connection is not initialized');
      }

      const stmt = this.db.prepare(sql);
      if (params && params.length > 0) {
        return stmt.all(...params) as T[];
      } else {
        return stmt.all() as T[];
      }
    } catch (error) {
      throw new Error(`Failed to query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a SELECT query and return first result
   */
  public queryOne<T = any>(sql: string, params?: any[]): T | undefined {
    this.ensureOpen();
    
    try {
      if (!this.db) {
        throw new Error('Database connection is not initialized');
      }

      const stmt = this.db.prepare(sql);
      if (params && params.length > 0) {
        return stmt.get(...params) as T | undefined;
      } else {
        return stmt.get() as T | undefined;
      }
    } catch (error) {
      throw new Error(`Failed to query one: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a transaction
   * All operations within the callback must succeed or all will rollback
   */
  public transaction<T>(callback: () => T): T {
    this.ensureOpen();
    
    try {
      if (!this.db) {
        throw new Error('Database connection is not initialized');
      }

      const transaction = this.db.transaction(callback);
      return transaction();
    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify database connection is open
   */
  private ensureOpen(): void {
    if (!this.isOpen || !this.db) {
      throw new Error('Database connection is not open. Call open() first.');
    }
  }

  /**
   * Get the database path
   */
  public getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Check if database connection is open
   */
  public isConnected(): boolean {
    return this.isOpen;
  }

  /**
   * Get raw database instance (use with caution)
   */
  public getRawDatabase(): Database.Database {
    this.ensureOpen();
    if (!this.db) {
      throw new Error('Database connection is not initialized');
    }
    return this.db;
  }
}
