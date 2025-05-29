import { FilterHandler } from './filter-handler';

export abstract class BaseFilterHandler<T> implements FilterHandler<T> {
  private nextHandler?: FilterHandler<T>;

  setNext(handler: FilterHandler<T>): FilterHandler<T> {
    this.nextHandler = handler;
    return handler; // Return the next handler to allow chaining like a.setNext(b).setNext(c)
  }

  handle(items: T[]): T[] {
    const filteredItems = this.apply(items);
    if (this.nextHandler) {
      return this.nextHandler.handle(filteredItems);
    }
    return filteredItems;
  }

  /**
   * Concrete subclasses must implement this method to apply their specific filtering logic.
   * @param items The array of items to be filtered.
   * @returns The filtered array of items.
   */
  protected abstract apply(items: T[]): T[];
}