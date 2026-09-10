import { DatabaseConnection } from '../database/DatabaseConnection';

export class TransactionManager {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Execute a callback function within a database transaction
   * @param callback Function to execute
   * @returns The result of the callback
   */
  public executeTransaction<T>(callback: () => T): T {
    const rawDb = this.db.getRawDatabase();
    const transaction = rawDb.transaction(callback);
    return transaction();
  }
}
