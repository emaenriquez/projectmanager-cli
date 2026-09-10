import { ProjectScanner } from '../../domain/services/ProjectScanner';
import { TechnologyDetector } from '../../domain/services/TechnologyDetector';
import { ProjectRepository, ProjectEntity } from '../../infrastructure/repositories/ProjectRepository';
import { TechnologyRepository } from '../../infrastructure/repositories/TechnologyRepository';
import { randomUUID } from 'crypto';

export class ScanProjectsUseCase {
  private scanner: ProjectScanner;
  private techDetector: TechnologyDetector;
  private projectRepo: ProjectRepository;
  private techRepo: TechnologyRepository;

  constructor() {
    this.scanner = new ProjectScanner();
    this.techDetector = new TechnologyDetector();
    this.projectRepo = new ProjectRepository();
    this.techRepo = new TechnologyRepository();
  }

  public execute(rootPath: string): { scanned: number; added: number; updated: number } {
    const scanResult = this.scanner.scanDirectory(rootPath);
    let added = 0;
    let updated = 0;

    for (const projectMeta of scanResult.projects) {
      const existingProject = this.projectRepo.findByPath(projectMeta.path);
      const projectId = existingProject ? existingProject.id : randomUUID();

      const projectEntity: ProjectEntity = {
        id: projectId,
        name: projectMeta.name,
        path: projectMeta.path,
        created_at: existingProject ? existingProject.created_at : new Date().toISOString(),
        last_opened: existingProject ? existingProject.last_opened : null,
        is_favorite: existingProject ? existingProject.is_favorite : false
      };

      if (existingProject) {
        this.projectRepo.update(projectEntity);
        updated++;
      } else {
        this.projectRepo.create(projectEntity);
        added++;
      }

      const techs = this.techDetector.detect(projectMeta.path);
      const techEntities = techs.map(t => ({
        id: randomUUID(),
        project_id: projectId,
        name: t.name,
        version: t.version || null,
        category: t.category
      }));
      
      this.techRepo.replaceProjectTechnologies(projectId, techEntities);
    }

    return {
      scanned: scanResult.scannedDirectories,
      added,
      updated
    };
  }
}
