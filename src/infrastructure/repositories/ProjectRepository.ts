import { DatabaseConnection } from '../database/DatabaseConnection';

export interface ProjectEntity {
  id: string;
  name: string;
  path: string;
  created_at: string;
  last_opened: string | null;
  is_favorite: boolean;
}

export class ProjectRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public findAll(): ProjectEntity[] {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('SELECT * FROM projects ORDER BY name ASC');
    const results = stmt.all() as any[];
    return results.map(this.mapRowToEntity);
  }

  public findById(id: string): ProjectEntity | undefined {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('SELECT * FROM projects WHERE id = ?');
    const result = stmt.get(id);
    return result ? this.mapRowToEntity(result) : undefined;
  }

  public findByPath(path: string): ProjectEntity | undefined {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('SELECT * FROM projects WHERE path = ?');
    const result = stmt.get(path);
    return result ? this.mapRowToEntity(result) : undefined;
  }

  public create(project: ProjectEntity): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      INSERT INTO projects (id, name, path, created_at, last_opened, is_favorite)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      project.id,
      project.name,
      project.path,
      project.created_at,
      project.last_opened,
      project.is_favorite ? 1 : 0
    );
  }

  public update(project: ProjectEntity): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      UPDATE projects 
      SET name = ?, path = ?, last_opened = ?, is_favorite = ?
      WHERE id = ?
    `);
    
    stmt.run(
      project.name,
      project.path,
      project.last_opened,
      project.is_favorite ? 1 : 0,
      project.id
    );
  }

  public delete(id: string): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
  }

  private mapRowToEntity(row: any): ProjectEntity {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      created_at: row.created_at,
      last_opened: row.last_opened,
      is_favorite: Boolean(row.is_favorite)
    };
  }
}
