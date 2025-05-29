// filepath: frontend/src/app/core/filters/handlers/branch-filter.ts
import { BaseFilterHandler } from '../base-filter-handler';
import { Deployment } from '../../../features/dashboard/models/deployment.model';

export class BranchFilter extends BaseFilterHandler<Deployment> {
  constructor(private branch: string | null | undefined) { // Branch can be null or undefined
    super();
  }

  protected apply(items: Deployment[]): Deployment[] {
    if (!this.branch) {
      return items; // No branch filter applied
    }
    const lowerCaseBranch = this.branch.toLowerCase();
    return items.filter(deployment =>
      deployment.branch && deployment.branch.toLowerCase() === lowerCaseBranch
    );
  }
}