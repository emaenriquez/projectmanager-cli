import { QueryBuilder, ProjectFilters, DetailedProject } from '../../infrastructure/repositories/QueryBuilder';

export class ListProjectsUseCase {
  private queryBuilder: QueryBuilder;

  constructor() {
    this.queryBuilder = new QueryBuilder();
  }

  public execute(filters: ProjectFilters): DetailedProject[] {
    return this.queryBuilder.findProjects(filters);
  }
}
