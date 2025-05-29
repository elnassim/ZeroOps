export interface FilterHandler<T> {
  setNext(handler: FilterHandler<T>): FilterHandler<T>;
  handle(items: T[]): T[];
}