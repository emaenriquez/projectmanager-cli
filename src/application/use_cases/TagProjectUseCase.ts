import { TagRepository } from '../../infrastructure/repositories/TagRepository';
import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { TransactionManager } from '../../infrastructure/repositories/TransactionManager';
import { randomUUID } from 'crypto';

export class TagProjectUseCase {
  private tagRepo: TagRepository;
  private projectRepo: ProjectRepository;
  private transactionManager: TransactionManager;

  constructor() {
    this.tagRepo = new TagRepository();
    this.projectRepo = new ProjectRepository();
    this.transactionManager = new TransactionManager();
  }

  public addTag(projectId: string, tagName: string): void {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.transactionManager.executeTransaction(() => {
      let tag = this.tagRepo.findByName(tagName);
      if (!tag) {
        tag = {
          id: randomUUID(),
          name: tagName,
          created_at: new Date().toISOString()
        };
        this.tagRepo.create(tag);
      }

      this.tagRepo.addTagToProject(projectId, tag.id);
    });
  }

  public removeTag(projectId: string, tagName: string): void {
    const tag = this.tagRepo.findByName(tagName);
    if (!tag) {
      return; // Tag doesn't exist
    }

    this.tagRepo.removeTagFromProject(projectId, tag.id);
  }
}
