import { DatabaseConnection } from '../database/DatabaseConnection';
import { ProjectEntity } from './ProjectRepository';
import { TagEntity } from './TagRepository';
import { TechnologyEntity } from './TechnologyRepository';

export interface ProjectFilters {
  name?: string;
  path?: string;
  is_favorite?: boolean;
  tags?: string[];
  technologies?: string[];
  sort?: 'name' | 'created_at' | 'last_opened';
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface DetailedProject extends ProjectEntity {
  tags: TagEntity[];
  technologies: TechnologyEntity[];
}

export class QueryBuilder {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public findProjects(filters: ProjectFilters): DetailedProject[] {
    const rawDb = this.db.getRawDatabase();
    
    let query = 'SELECT DISTINCT p.* FROM projects p';
    const params: any[] = [];

    // Joins
    if (filters.tags && filters.tags.length > 0) {
      query += ' JOIN project_tags pt ON p.id = pt.project_id';
      query += ' JOIN tags t ON pt.tag_id = t.id';
    }
    
    if (filters.technologies && filters.technologies.length > 0) {
      query += ' JOIN technologies tech ON p.id = tech.project_id';
    }

    // Where clauses
    const whereClauses: string[] = [];

    if (filters.name) {
      whereClauses.push('p.name LIKE ?');
      params.push(`%${filters.name}%`);
    }

    if (filters.path) {
      whereClauses.push('p.path LIKE ?');
      params.push(`%${filters.path}%`);
    }

    if (filters.is_favorite !== undefined) {
      whereClauses.push('p.is_favorite = ?');
      params.push(filters.is_favorite ? 1 : 0);
    }

    if (filters.tags && filters.tags.length > 0) {
      const placeholders = filters.tags.map(() => '?').join(',');
      whereClauses.push(`t.name IN (${placeholders})`);
      params.push(...filters.tags);
    }

    if (filters.technologies && filters.technologies.length > 0) {
      const placeholders = filters.technologies.map(() => '?').join(',');
      whereClauses.push(`tech.name IN (${placeholders})`);
      params.push(...filters.technologies);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Sort
    const sortField = filters.sort === 'created_at' ? 'p.created_at' 
                    : filters.sort === 'last_opened' ? 'p.last_opened'
                    : 'p.name';
    const sortOrder = filters.order === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    // Pagination
    if (filters.limit !== undefined) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset !== undefined) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    // Fetch projects
    const stmt = rawDb.prepare(query);
    const projects = stmt.all(...params) as ProjectEntity[];

    // Fetch related data (in a real app, might want to batch this or use JSON grouping if SQLite version supports it)
    const result: DetailedProject[] = [];
    
    for (const project of projects) {
      // Get Tags
      const tagsStmt = rawDb.prepare(`
        SELECT t.* FROM tags t
        JOIN project_tags pt ON t.id = pt.tag_id
        WHERE pt.project_id = ?
      `);
      const tags = tagsStmt.all(project.id) as TagEntity[];

      // Get Technologies
      const techStmt = rawDb.prepare(`
        SELECT * FROM technologies WHERE project_id = ?
      `);
      const technologies = techStmt.all(project.id) as TechnologyEntity[];

      result.push({
        ...project,
        is_favorite: Boolean(project.is_favorite), // ensure boolean
        tags,
        technologies
      });
    }

    return result;
  }
}
