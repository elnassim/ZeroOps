export interface SortingStrategy<T> {
  sort(items: T[]): T[];
}