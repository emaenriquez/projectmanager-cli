import { DatabaseConnection } from '../database/DatabaseConnection';

export interface TechnologyEntity {
  id: string;
  project_id: string;
  name: string;
  version: string | null;
  category: string;
}

export class TechnologyRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public getTechnologiesForProject(projectId: string): TechnologyEntity[] {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      SELECT * FROM technologies 
      WHERE project_id = ?
      ORDER BY category ASC, name ASC
    `);
    return stmt.all(projectId) as TechnologyEntity[];
  }

  public addTechnology(technology: TechnologyEntity): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare(`
      INSERT INTO technologies (id, project_id, name, version, category)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      technology.id,
      technology.project_id,
      technology.name,
      technology.version,
      technology.category
    );
  }

  public removeTechnology(id: string): void {
    const rawDb = this.db.getRawDatabase();
    const stmt = rawDb.prepare('DELETE FROM technologies WHERE id = ?');
    stmt.run(id);
  }

  public replaceProjectTechnologies(projectId: string, technologies: TechnologyEntity[]): void {
    const rawDb = this.db.getRawDatabase();
    
    // Delete all existing technologies for this project
    rawDb.prepare('DELETE FROM technologies WHERE project_id = ?').run(projectId);
    
    // Insert the new ones
    const insertStmt = rawDb.prepare(`
      INSERT INTO technologies (id, project_id, name, version, category)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const tech of technologies) {
      insertStmt.run(tech.id, tech.project_id, tech.name, tech.version, tech.category);
    }
  }
}
