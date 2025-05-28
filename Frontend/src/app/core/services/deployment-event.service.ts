// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Frontend\src\app\core\services\deployment-event.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable, ReplaySubject } from 'rxjs';
// import { shareReplay } from 'rxjs/operators';

export interface DeploymentEvent {
  deploymentId: string; // Can be a temporary ID if the actual one isn't known yet
  type:
    | 'STARTED'
    | 'REDEPLOY_STARTED'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CLONING'
    | 'BUILDING'
    | 'UPLOADING'
    | 'DEPLOYED'
    | 'STATUS_UPDATE'
    | 'ERROR'
    | 'POLL_ERROR';
  message: string;
  timestamp: Date;
  details?: any; // Optional: for richer log data like error objects or specific metrics
}

@Injectable({ providedIn: 'root' })
export class DeploymentEventService {
  private eventSubject = new ReplaySubject<DeploymentEvent>(50);

  // Public observable for subscribers
  // shareReplay(1) can be useful if new subscribers should get the last emitted event,
  // but for a live log, a simple Subject is often fine.
  public events$: Observable<DeploymentEvent> =
    this.eventSubject.asObservable();

  constructor() {}

  emit(event: DeploymentEvent) {
    console.log('[DeploymentEventService] Emitting event:', event);
    this.eventSubject.next(event);
  }
}
