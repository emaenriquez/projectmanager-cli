import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { ScanProjectsUseCase } from './ScanProjectsUseCase';
import * as fs from 'fs';

export class SyncProjectsUseCase {
  private projectRepo: ProjectRepository;
  private scanUseCase: ScanProjectsUseCase;

  constructor() {
    this.projectRepo = new ProjectRepository();
    this.scanUseCase = new ScanProjectsUseCase();
  }

  public execute(): { removed: number; added: number; updated: number; scanned: number } {
    let removed = 0;
    let added = 0;
    let updated = 0;
    let scanned = 0;

    const allProjects = this.projectRepo.findAll();
    
    // First, remove missing projects
    for (const project of allProjects) {
      if (!fs.existsSync(project.path)) {
        this.projectRepo.delete(project.id);
        removed++;
      } else {
        // Rescan existing project paths to update metadata/technologies
        const result = this.scanUseCase.execute(project.path);
        added += result.added;
        updated += result.updated;
        scanned += result.scanned;
      }
    }

    return {
      removed,
      added,
      updated,
      scanned
    };
  }
}
