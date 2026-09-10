import { DatabaseConnection } from '../database/DatabaseConnection';

export interface TagEntity {
  id: string;
  name: string;
  created_at: string;
}

export class TagRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public findAll(): TagEntity[] {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('SELECT * FROM tags ORDER BY name ASC');
    return stmt.all() as TagEntity[];
  }

  public findById(id: string): TagEntity | undefined {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id) as TagEntity | undefined;
  }

  public findByName(name: string): TagEntity | undefined {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('SELECT * FROM tags WHERE name = ?');
    return stmt.get(name) as TagEntity | undefined;
  }

  public create(tag: TagEntity): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      INSERT INTO tags (id, name, created_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(tag.id, tag.name, tag.created_at);
  }

  public delete(id: string): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run(id);
  }

  // --- Project Tags operations ---

  public getTagsForProject(projectId: string): TagEntity[] {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      SELECT t.* FROM tags t
      JOIN project_tags pt ON t.id = pt.tag_id
      WHERE pt.project_id = ?
      ORDER BY t.name ASC
    `);
    return stmt.all(projectId) as TagEntity[];
  }

  public addTagToProject(projectId: string, tagId: string): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      INSERT OR IGNORE INTO project_tags (project_id, tag_id)
      VALUES (?, ?)
    `);
    stmt.run(projectId, tagId);
  }

  public removeTagFromProject(projectId: string, tagId: string): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      DELETE FROM project_tags 
      WHERE project_id = ? AND tag_id = ?
    `);
    stmt.run(projectId, tagId);
  }
}
