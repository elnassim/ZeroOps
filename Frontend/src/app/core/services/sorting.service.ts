import { Injectable } from '@angular/core';
import { SortingStrategy } from '../sorting/sorting-strategy';
import { Deployment } from '../../features/dashboard/models/deployment.model'; // Adjusted path

@Injectable({ providedIn: 'root' })
export class SortingService {
  private strategy!: SortingStrategy<Deployment>;

  setStrategy(strategy: SortingStrategy<Deployment>) {
    this.strategy = strategy;
  }

  applyStrategy(items: Deployment[]): Deployment[] {
    return this.strategy
      ? this.strategy.sort(items)
      : items;
  }
}