import { SortingStrategy } from '../sorting-strategy';
import { Deployment } from '../../../features/dashboard/models/deployment.model'; // Adjusted path

export class SortByBranch implements SortingStrategy<Deployment> {
  sort(items: Deployment[]): Deployment[] {
    return [...items].sort((a, b) =>
      (a.branch || '').localeCompare(b.branch || '')
    );
  }
}