// filepath: frontend/src/app/core/sorting/strategies/sort-by-status.ts
import { SortingStrategy } from '../sorting-strategy';
import { Deployment } from '../../../features/dashboard/models/deployment.model'; // Adjusted path

// Define a sensible order for your statuses. Adjust as needed.
const statusOrder: string[] = [
  'DEPLOYED', // Or 'SUCCESS'
  'BUILDING', // Or other in-progress states like 'CLONING', 'UPLOADING', 'QUEUED', 'IN_PROGRESS'
  'PENDING',
  'FAILED',
  'CANCELLED',
  'UNKNOWN'
];

export class SortByStatus implements SortingStrategy<Deployment> {
  sort(items: Deployment[]): Deployment[] {
    return [...items].sort((a, b) => {
      const statusA = a.status.toUpperCase();
      const statusB = b.status.toUpperCase();
      const indexA = statusOrder.indexOf(statusA);
      const indexB = statusOrder.indexOf(statusB);

      // Handle statuses not in the predefined order by pushing them to the end
      const effectiveIndexA = indexA === -1 ? statusOrder.length : indexA;
      const effectiveIndexB = indexB === -1 ? statusOrder.length : indexB;

      return effectiveIndexA - effectiveIndexB;
    });
  }
}