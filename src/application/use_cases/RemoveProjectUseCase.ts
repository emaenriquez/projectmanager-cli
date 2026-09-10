import { ProjectRepository } from '../../infrastructure/repositories/ProjectRepository';
import { TransactionManager } from '../../infrastructure/repositories/TransactionManager';

export class RemoveProjectUseCase {
  private projectRepo: ProjectRepository;
  private transactionManager: TransactionManager;

  constructor() {
    this.projectRepo = new ProjectRepository();
    this.transactionManager = new TransactionManager();
  }

  public execute(projectId: string): void {
    const project = this.projectRepo.findById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.transactionManager.executeTransaction(() => {
      // Due to cascading deletes (ON DELETE CASCADE) in schema,
      // deleting the project will also delete project_tags and technologies
      this.projectRepo.delete(projectId);
    });
  }
}
