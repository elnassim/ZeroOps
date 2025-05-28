import { Component, Input, Output, EventEmitter, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type { Deployment } from "../../../../models/deployment.model";
import { StatusBadgeComponent } from "../status-badge/status-badge.component";
import { DeploymentService, DeployResponse } from "../../../../services/deployment.service";
import { DeployStatusService } from "../../../../services/deploy-status.service";
import { Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { DeploymentEventService, DeploymentEvent } from "../../../../../../core/services/deployment-event.service"; // Import

@Component({
  selector: "app-deployment-list",
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: "./deployment-list.component.html",
  styleUrls: ["./deployment-list.component.scss"],
})
export class DeploymentListComponent implements OnDestroy {
  @Input() deployments: Deployment[] = [];
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];
  @Input() viewMode: 'table' | 'card' = 'table';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() deploymentActionStarted = new EventEmitter<string>(); // Emits deploymentId
  @Output() deploymentActionFinished = new EventEmitter<{deploymentId: string, success: boolean}>(); // Emits outcome

  private unsubscribe$ = new Subject<void>();

  redeployingId: string | null = null;

  constructor(
    private deploymentService: DeploymentService,
    private deployStatusService: DeployStatusService,
    private router: Router,
    private eventBus: DeploymentEventService // Inject
    // Optional: private toastService: ToastService
  ) {}

  get totalPages(): number {
    if (!this.totalItems || !this.pageSize) return 0;
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get paginationRange(): number[] {
    const totalPagesToShow = 5;
    const pages: number[] = [];

    if (this.totalPages <= totalPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage: number;
      let endPage: number;

      if (this.currentPage <= Math.ceil(totalPagesToShow / 2)) {
        startPage = 1;
        endPage = totalPagesToShow;
      } else if (this.currentPage + Math.floor(totalPagesToShow / 2) >= this.totalPages) {
        startPage = this.totalPages - totalPagesToShow + 1;
        endPage = this.totalPages;
      } else {
        startPage = this.currentPage - Math.floor(totalPagesToShow / 2);
        endPage = this.currentPage + Math.floor(totalPagesToShow / 2);
        if (totalPagesToShow % 2 === 0) { // Adjust for even number of pages to show
            endPage = this.currentPage + (totalPagesToShow / 2) - 1;
        }
      }

      startPage = Math.max(1, startPage);
      endPage = Math.min(this.totalPages, endPage);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    return pages;
  }

  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.startItem + this.pageSize - 1, this.totalItems);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSizeChange.emit(Number(select.value));
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  viewLogs(deploymentId: string): void {
    console.log(`View logs for deployment ${deploymentId}`);
    // Navigate to the new logs page
    this.router.navigate(['/dashboard/logs']);
    // If you want to filter logs for this specific deployment on the logs page,
    // you might need to pass the deploymentId as a query param or use a service
    // For now, just navigating to the general logs page.
    // Example with query param:
    // this.router.navigate(['/dashboard/logs'], { queryParams: { deploymentId: deploymentId } });
  }

  redeploy(deploymentId: string): void {
    if (this.redeployingId) return;

    this.redeployingId = deploymentId;
    this.deploymentActionStarted.emit(deploymentId); // Inform parent
    const deployment = this.deployments.find(d => d.deploymentId === deploymentId);
    if (deployment) {
      deployment.status = 'building'; // Optimistic UI update
    }

    // Emit REDEPLOY_STARTED event
    this.eventBus.emit({
      deploymentId: deploymentId,
      type: 'REDEPLOY_STARTED',
      message: `Redeployment initiated for ${deploymentId}. Repo: ${deployment?.gitUrl || 'N/A'}, Branch: ${deployment?.branch || 'N/A'}`,
      timestamp: new Date()
    });

    this.deploymentService.redeploy(deploymentId).pipe(
      tap((deployResponse: DeployResponse) => {
        console.log('Redeployment initiated via backend:', deployResponse);
        // Event for successful initiation of redeploy
        this.eventBus.emit({
          deploymentId: deployResponse.deploymentId, // Should be the same as input deploymentId
          type: 'STARTED', // Or a more specific 'REDEPLOY_QUEUED'
          message: `Redeployment ${deployResponse.deploymentId} has been queued/started by backend.`,
          timestamp: new Date()
        });
      }),
      switchMap((deployResponse: DeployResponse) =>
        // Assuming pollStatus will also emit events via DeploymentEventService
        this.deployStatusService.pollStatus(deployResponse.deploymentId)
      ),
      takeUntil(this.unsubscribe$)
    ).subscribe({
      next: (statusResponse) => {
        console.log('Redeployment status update from polling:', statusResponse);
        if (deployment) {
          deployment.status = statusResponse.status.toLowerCase() as "success" | "building" | "failed"; // Update local status
          // The DeployStatusService should be emitting detailed events.
          // We only need to handle the final state here for this component's specific logic.
          if (statusResponse.status === 'SUCCESS' || statusResponse.status === 'DEPLOYED' || statusResponse.status === 'FAILED' || statusResponse.status === 'POLL_ERROR_SERVICE' || statusResponse.status === 'TIMEOUT_POLL') {
            this.redeployingId = null;
            const success = statusResponse.status === 'SUCCESS' || statusResponse.status === 'DEPLOYED';
            this.deploymentActionFinished.emit({deploymentId: deploymentId, success: success});
            // No need to emit SUCCEEDED/FAILED here if DeployStatusService does it.
          }
        }
      },
      error: (err) => {
        console.error('Error during redeployment or polling pipeline:', err);
        if (deployment) {
          deployment.status = 'failed'; // Update UI
        }
        this.redeployingId = null;
        this.deploymentActionFinished.emit({deploymentId: deploymentId, success: false});
        // Emit a FAILED event if not already handled by pollStatus's error path
        this.eventBus.emit({
          deploymentId: deploymentId,
          type: 'FAILED',
          message: `Redeployment pipeline for ${deploymentId} failed. Error: ${err.message || 'Unknown error'}`,
          timestamp: new Date(),
          details: err
        });
      }
    });
  }

  copyToClipboard(text: string, deploymentId: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      console.log(`URL copied for ${deploymentId}: ${text}`);
      // Consider using a ToastService for user feedback
      alert(`URL Copied: ${text}`);
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
      alert('Failed to copy URL.');
    });
  }

  formatDuration(seconds: number): string {
    if (seconds < 0 || seconds === undefined || seconds === null) {
      return "-";
    }
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}