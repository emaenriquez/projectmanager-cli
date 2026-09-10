import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ProjectRepository, ProjectEntity } from '../../infrastructure/repositories/ProjectRepository';
import { TechnologyRepository } from '../../infrastructure/repositories/TechnologyRepository';
import { TechnologyDetector } from '../../domain/services/TechnologyDetector';

export class AddProjectUseCase {
  private projectRepo: ProjectRepository;
  private techRepo: TechnologyRepository;
  private techDetector: TechnologyDetector;

  constructor() {
    this.projectRepo = new ProjectRepository();
    this.techRepo = new TechnologyRepository();
    this.techDetector = new TechnologyDetector();
  }

  public execute(projectPath: string, name?: string): ProjectEntity {
    const absolutePath = path.resolve(projectPath);

    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
      throw new Error(`Invalid project path: ${absolutePath}`);
    }

    const existingProject = this.projectRepo.findByPath(absolutePath);
    if (existingProject) {
      throw new Error(`Project already exists: ${absolutePath}`);
    }

    const projectName = name || path.basename(absolutePath);
    const projectId = randomUUID();

    const projectEntity: ProjectEntity = {
      id: projectId,
      name: projectName,
      path: absolutePath,
      created_at: new Date().toISOString(),
      last_opened: null,
      is_favorite: false
    };

    // Create project first
    this.projectRepo.create(projectEntity);

    // Detect and add technologies (won't fail if none found)
    const techs = this.techDetector.detect(absolutePath);
    for (const t of techs) {
      this.techRepo.addTechnology({
        id: randomUUID(),
        project_id: projectId,
        name: t.name,
        version: t.version || null,
        category: t.category
      });
    }

    return projectEntity;
  }
}

