import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, takeUntil, finalize, tap } from 'rxjs/operators';
import { DeploymentEvent, DeploymentEventService } from '../../../../core/services/deployment-event.service';

// Assuming DeployResponse and DeploymentStatusResponse are correctly defined
// and that DeploymentService here is the one for initiating,
// and DeployStatusService is for polling.
import { DeploymentService, DeployResponse } from '../../services/deployment.service';
import { DeployStatusService, DeploymentStatusResponse } from '../../services/deploy-status.service';
import { ToastService } from '../../../../core/services/toast.service';
// import { ActiveDeploymentStateService } from '../../../../core/services/active-deployment-state.service'; // If you implement state persistence

@Component({
  selector: 'app-new-deployment-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './new-deployment-page.component.html',
  styleUrls: ['./new-deployment-page.component.scss']
})
export class NewDeploymentPageComponent implements OnInit, OnDestroy {
  deployForm!: FormGroup;
  isLoading = false;
  isPolling = false;
  deploymentId: string | null = null; // This will store the UUID
  currentStatus: string | null = null;
  errorMessage: string | null = null;
  deploymentUrl: string | null = null; // To store the final URL

  private unsubscribe$ = new Subject<void>();
  private gitUrlRegex = /^(?:git|ssh|https|http):\/\/[^\s/$.?#].[^\s]*$/i; // Basic Git URL regex, adjust as needed

  constructor(
    private fb: FormBuilder, // Inject FormBuilder
    private router: Router,
    private deploymentService: DeploymentService,
    private deployStatusService: DeployStatusService,
    private toastService: ToastService,
    private eventBus: DeploymentEventService,
    // private activeDeploymentStateService: ActiveDeploymentStateService // If you implement state persistence
  ) {
    console.log('[NewDeploymentPageComponent] Constructor called.');
  }

  ngOnInit(): void {
    console.log('[NewDeploymentPageComponent] ngOnInit called.');
    this.deployForm = this.fb.group({
      repoUrl: ['', [Validators.required, Validators.pattern(this.gitUrlRegex)]],
      branch: ['', Validators.pattern(/^[a-zA-Z0-9_\-\.\/]+$/)], // Basic pattern for branch, allow empty for default
      strategyType: ['default', Validators.required] // Add strategyType with default
    });
    console.log('[NewDeploymentPageComponent] ngOnInit completed, form initialized.');
    // Logic to restore active deployment if using ActiveDeploymentStateService would go here
  }

  // Add getters for easy access to form controls in the template
  get repoUrl() { return this.deployForm.get('repoUrl'); }
  get branch() { return this.deployForm.get('branch'); }
  get strategyType() { return this.deployForm.get('strategyType'); }


  onSubmit(): void {
    console.log('[NewDeploymentPageComponent] onSubmit called.');
    if (this.deployForm.invalid) {
      this.deployForm.markAllAsTouched(); // Mark all fields as touched to show errors
      const formErrors = this.getFormValidationErrors();
      this.errorMessage = "Please correct the errors: " + formErrors.join(', ');
      this.toastService.showError(this.errorMessage);
      console.warn('[NewDeploymentPageComponent] Form is invalid:', this.deployForm.errors, 'Touched:', this.deployForm.touched);
      return;
    }

    this.isLoading = true;
    this.isPolling = false; // Reset polling state
    this.deploymentId = null; // Reset before new deployment
    this.currentStatus = "Initializing deployment...";
    this.errorMessage = null;
    this.deploymentUrl = null;

    const { repoUrl, branch, strategyType } = this.deployForm.value; // Get values from reactive form
    const effectiveBranch = branch || null; // Send null if branch is empty string, backend handles default

    this.toastService.showInfo('Deployment process started...');
    console.log(`[NewDeploymentPageComponent] Initiating deployment for URL: ${repoUrl}, Branch: ${effectiveBranch || 'default'}, Strategy: ${strategyType}`);

    this.eventBus.emit({
      deploymentId: 'pending-initiation',
      type: 'STARTED',
      message: `Deployment initiated for ${repoUrl} (branch: ${effectiveBranch || 'default'}) with ${strategyType} strategy.`,
      timestamp: new Date()
    });

    this.stopPollingAndCleanup(); // Ensure any previous polling is stopped

    this.deploymentService.deploy(repoUrl, effectiveBranch, strategyType).pipe(
      tap((deployResponse: DeployResponse) => {
        if (!deployResponse || !deployResponse.deploymentId) {
          console.error('[NewDeploymentPageComponent] Invalid deployResponse (missing deploymentId):', deployResponse);
          this.eventBus.emit({
            deploymentId: 'initiation-error',
            type: 'ERROR',
            message: 'Failed to get deploymentId from backend on initiation.',
            timestamp: new Date(),
            details: deployResponse
          });
          throw new Error('Deployment UUID not received from initial deploy call.');
        }
        this.deploymentId = deployResponse.deploymentId;
        this.currentStatus = "Deployment initiated, polling status...";
        this.toastService.showSuccess(`Deployment initiated! UUID: ${this.deploymentId}`);
        console.log('[NewDeploymentPageComponent] Deployment initiated response:', deployResponse);
        this.isPolling = true; // Set polling to true as we are about to start

        this.eventBus.emit({
            deploymentId: this.deploymentId!, // Assert deploymentId is not null here
            type: 'STARTED', // Or a more specific 'QUEUED' or 'INITIALIZED'
            message: `Deployment ${this.deploymentId!} for ${repoUrl} (branch: ${effectiveBranch || 'default'}) using ${strategyType} strategy has been queued.`,
            timestamp: new Date()
        });
      }),
      switchMap((deployResponse: DeployResponse) => { // deployResponse here still has deploymentId
        if (!this.deploymentId) {
            // This case should ideally be caught by the tap operator's error throwing
            console.error('[NewDeploymentPageComponent] deploymentId is null before polling in switchMap.');
            throw new Error('Deployment ID not available for polling.');
        }
        console.log(`[NewDeploymentPageComponent] switchMap: Polling status for deployment UUID: ${this.deploymentId}`);
        return this.deployStatusService.pollStatus(this.deploymentId!); // Assert deploymentId is not null
      }),
      takeUntil(this.unsubscribe$),
      finalize(() => {
        this.isLoading = false;
        // isPolling is managed by the next/error/complete handlers of the pollStatus observable
        console.log('[NewDeploymentPageComponent] Finalize: isLoading set to false.');
      })
    ).subscribe({
      next: (statusResponse: DeploymentStatusResponse) => {
        console.log(`[NewDeploymentPageComponent] Deployment status update:`, statusResponse);
        this.currentStatus = `Status: ${statusResponse.status}`; // Update current status for UI
        this.deploymentUrl = statusResponse.url || null;

        const normalizedStatus = statusResponse.status ? statusResponse.status.toLowerCase() : '';

        this.eventBus.emit({
          deploymentId: this.deploymentId!,
          type: this.mapStatusToEventType(statusResponse.status),
          message: `Deployment ${this.deploymentId!} status: ${statusResponse.status}. ${statusResponse.message || ''}`,
          timestamp: new Date(),
          details: { url: this.deploymentUrl }
        });

        if (normalizedStatus === 'success' || normalizedStatus === 'deployed' || normalizedStatus === 'failed' || normalizedStatus === 'error' || normalizedStatus === 'poll_error') {
          this.isPolling = false; // Stop polling on terminal states
          if (normalizedStatus === 'success' || normalizedStatus === 'deployed') {
            this.toastService.showSuccess(`Deployment Successful! UUID: ${this.deploymentId!}. URL: ${this.deploymentUrl || 'N/A'}`);
          } else {
            this.toastService.showError(`Deployment Failed. UUID: ${this.deploymentId!}. Status: ${statusResponse.status}. ${statusResponse.message || ''}`);
            this.errorMessage = `Deployment failed with status: ${statusResponse.status}. ${statusResponse.message || ''}`;
          }
          console.log(`[NewDeploymentPageComponent] Terminal status reached for ${this.deploymentId}: ${normalizedStatus}. Polling stopped.`);
        } else {
          // Non-terminal status, polling continues implicitly via deployStatusService
          console.log(`[NewDeploymentPageComponent] Intermediate status for ${this.deploymentId}: ${normalizedStatus}`);
        }
      },
      error: (err: Error) => {
        console.error('[NewDeploymentPageComponent] Error during deployment or polling pipeline:', err);
        this.errorMessage = err.message || 'An unexpected error occurred during deployment.';
        this.toastService.showError(this.errorMessage);
        this.eventBus.emit({
          deploymentId: this.deploymentId || 'unknown-id-on-error',
          type: 'ERROR', // Or FAILED if it's a definitive failure of the deployment itself
          message: `Error in deployment/polling: ${this.errorMessage}`,
          timestamp: new Date(),
          details: err
        });
        this.stopPollingAndCleanup(); // Ensure isLoading and isPolling are false
      },
      complete: () => {
        // This 'complete' is for the subscription in NewDeploymentPageComponent.
        // It will be called when takeUntil(this.unsubscribe$) emits OR pollStatus completes.
        console.log(`[NewDeploymentPageComponent] Deployment and polling pipeline completed for ${this.deploymentId}.`);
        // Ensure isPolling is false if not already set by a terminal status in 'next' or by error
        if (this.isPolling) {
            this.isPolling = false;
            console.log('[NewDeploymentPageComponent] Polling explicitly stopped in complete().');
        }
        // isLoading should have been set to false in finalize
      }
    });
  }

  private mapStatusToEventType(status?: string): DeploymentEvent['type'] {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'SUCCESS':
      case 'DEPLOYED':
        return 'SUCCEEDED';
      case 'FAILED':
      case 'ERROR': // Assuming ERROR from backend is a final failed state
        return 'FAILED';
      case 'POLL_ERROR': // Specific event for polling errors
          return 'POLL_ERROR';
      case 'CLONING': return 'CLONING';
      case 'BUILDING': return 'BUILDING';
      case 'UPLOADING': return 'UPLOADING';
      // Add other specific statuses from your backend if needed
      default:
        return 'STATUS_UPDATE'; // For any other non-terminal status
    }
  }

  private stopPollingAndCleanup(): void {
    console.log('[NewDeploymentPageComponent] stopPollingAndCleanup called.');
    this.unsubscribe$.next(); // Signal to stop any ongoing operations in this component's stream
    // isLoading and isPolling are typically managed by the main subscription's finalize/error/complete
    // but setting them here ensures a clean state if called independently.
    this.isLoading = false;
    this.isPolling = false;
    console.log('[NewDeploymentPageComponent] Polling stopped and cleanup performed.');
  }

  private getFormValidationErrors(): string[] {
    const errors: string[] = [];
    Object.keys(this.deployForm.controls).forEach(key => {
      const controlErrors = this.deployForm.get(key)?.errors;
      if (controlErrors != null) {
        Object.keys(controlErrors).forEach(keyError => {
          errors.push(`Field '${key}' has error: ${keyError}`);
        });
      }
    });
    return errors;
  }

  ngOnDestroy(): void {
    console.log('[NewDeploymentPageComponent] ngOnDestroy called. Unsubscribing.');
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}