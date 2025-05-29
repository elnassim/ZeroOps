// filepath: frontend/src/app/core/filters/handlers/status-filter.ts
import { BaseFilterHandler } from '../base-filter-handler';
import { Deployment } from '../../../features/dashboard/models/deployment.model';

export class StatusFilter extends BaseFilterHandler<Deployment> {
  constructor(private statuses: string[]) { // Expect an array of statuses
    super();
  }

  protected apply(items: Deployment[]): Deployment[] {
    if (!this.statuses || this.statuses.length === 0) {
      return items; // No status filter applied, or "ALL" statuses
    }
    const upperCaseStatuses = this.statuses.map(s => s.toUpperCase());
    return items.filter(deployment => upperCaseStatuses.includes(deployment.status.toUpperCase()));
  }
}