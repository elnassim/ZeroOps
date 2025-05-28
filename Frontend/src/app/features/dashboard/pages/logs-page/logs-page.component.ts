import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { DeploymentEventService, DeploymentEvent } from '../../../../core/services/deployment-event.service';

@Component({
  selector: 'app-logs-page',
  standalone: true,
  imports: [CommonModule, DatePipe], // Add DatePipe here
  templateUrl: './logs-page.component.html',
  styleUrls: ['./logs-page.component.scss']
})
export class LogsPageComponent implements OnInit, OnDestroy {
  events: DeploymentEvent[] = [];
  private eventsSubscription!: Subscription;
  maxLogEntries = 100; // Keep a maximum number of log entries

  constructor(private eventBus: DeploymentEventService) {}

  ngOnInit(): void {
    this.eventsSubscription = this.eventBus.events$.subscribe(event => {
      this.events.unshift(event); // Add new events to the top
      if (this.events.length > this.maxLogEntries) {
        this.events.pop(); // Remove the oldest event if limit is exceeded
      }
    });
  }

  ngOnDestroy(): void {
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
  }

  getEventClass(eventType: DeploymentEvent['type']): string {
    switch (eventType) {
      case 'SUCCEEDED':
      case 'DEPLOYED':
        return 'log-success';
      case 'FAILED':
      case 'ERROR':
      case 'POLL_ERROR':
        return 'log-error';
      case 'STARTED':
      case 'REDEPLOY_STARTED':
        return 'log-started';
      case 'BUILDING':
      case 'CLONING':
      case 'UPLOADING':
        return 'log-progress';
      default:
        return 'log-info';
    }
  }
}