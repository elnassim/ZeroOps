// filepath: frontend/src/app/core/sorting/strategies/sort-by-date.ts
import { SortingStrategy } from '../sorting-strategy';
import { Deployment } from '../../../features/dashboard/models/deployment.model'; // Adjusted path

export class SortByDate implements SortingStrategy<Deployment> {
  sort(items: Deployment[]): Deployment[] {
    return [...items].sort((a, b) => {
      const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return dateB - dateA; // Descending by date (newest first)
    });
  }
}