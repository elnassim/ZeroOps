// filepath: frontend/src/app/core/filters/handlers/date-range-filter.ts
import { BaseFilterHandler } from '../base-filter-handler';
import { Deployment } from '../../../features/dashboard/models/deployment.model';

export class DateRangeFilter extends BaseFilterHandler<Deployment> {
  private fromTime?: number;
  private toTime?: number;

  constructor(private fromDateStr?: string | null, private toDateStr?: string | null) {
    super();
    if (this.fromDateStr) {
      // Assuming fromDateStr is 'YYYY-MM-DD'. Set to start of the day.
      const from = new Date(this.fromDateStr);
      from.setHours(0, 0, 0, 0);
      this.fromTime = from.getTime();
    }
    if (this.toDateStr) {
      // Assuming toDateStr is 'YYYY-MM-DD'. Set to end of the day.
      const to = new Date(this.toDateStr);
      to.setHours(23, 59, 59, 999);
      this.toTime = to.getTime();
    }
  }

  protected apply(items: Deployment[]): Deployment[] {
    if (!this.fromTime && !this.toTime) {
      return items; // No date filter applied
    }

    return items.filter(deployment => {
      if (!deployment.startedAt) return false; // Or handle as per your logic if startedAt can be null
      const deploymentTime = new Date(deployment.startedAt).getTime();

      const afterFrom = this.fromTime ? deploymentTime >= this.fromTime : true;
      const beforeTo = this.toTime ? deploymentTime <= this.toTime : true;

      return afterFrom && beforeTo;
    });
  }
}