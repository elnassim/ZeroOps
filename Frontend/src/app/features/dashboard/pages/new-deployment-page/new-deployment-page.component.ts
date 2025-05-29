import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap, tap, finalize, catchError } from 'rxjs/operators';
// Remove DeployApplicationRequest from this import as it's not exported by the service
import { DeploymentService, DeployResponse } from '../../services/deployment.service';
import { DeployStatusService, DeploymentStatusResponse } from '../../services/deploy-status.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DeploymentEventService, DeploymentEvent } from '../../../../core/services/deployment-event.service';

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
  errorMessage: string | null = null;
  deploymentId: string | null = null;
  currentStatus: string | null = null;
  deploymentUrl: string | null = null;

  private destroy$ = new Subject<void>();
  private pollingStop$ = new Subject<void>(); // Used to stop the current polling operation

  private gitUrlRegex = /^(?:(?:https?|git):\/\/|git@)(?:[^:]+@)?(?:[\w.-]+)(?:\.[\w.-]+)?(?:\/[\w.-~]*)*\/([\w.-]+?)(\.git)?(?:\/?|\#[\w\.-]+?)$/;

  constructor(
    private fb: FormBuilder,
    private deploymentService: DeploymentService,
    private router: Router,
    private deployStatusService: DeployStatusService,
    private toastService: ToastService,
    private eventBus: DeploymentEventService,
  ) {}

  ngOnInit(): void {
    this.deployForm = this.fb.group({
      repoUrl: ['', [Validators.required, Validators.pattern(this.gitUrlRegex)]],
      branch: ['main', Validators.required],
    });
  }

  get repoUrl() { return this.deployForm.get('repoUrl'); }
  get branch() { return this.deployForm.get('branch'); }

  onSubmit(): void {
    if (this.deployForm.invalid) {
      this.errorMessage = 'Please correct the errors in the form.';
      this.deployForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isPolling = false;
    this.errorMessage = null;
    this.deploymentId = null;
    this.currentStatus = 'Initiating deployment...';
    this.deploymentUrl = null;
    this.pollingStop$.next(); // Signal to stop any ongoing polling from previous submissions

    const { repoUrl, branch } = this.deployForm.value;
    const appName = this.extractAppNameFromRepoUrl(repoUrl);

    // Call the 'deploy' method with individual arguments
    this.deploymentService.deploy(repoUrl, branch, appName)
      .pipe(
        tap((response: DeployResponse) => {
          if (response && response.deploymentId) {
            this.deploymentId = response.deploymentId;
            this.deploymentUrl = response.deploymentUrl || null;
            const idMessagePart = `ID: ${this.deploymentId}`; // this.deploymentId is string here
            this.currentStatus = `Deployment initiated (${idMessagePart}). Waiting for status updates...`;
            // Corrected ToastService call: combine title and message
            this.toastService.showSuccess(`Deployment initiated! ${idMessagePart}`);
            
            this.eventBus.emit({
              type: 'STARTED',
              deploymentId: this.deploymentId, 
              message: `Deployment started for ${repoUrl}. ID: ${this.deploymentId}`,
              timestamp: new Date(),
              details: { repoUrl, branch, appName }
            });
            this.isPolling = true;
          } else {
            console.error('Invalid response from deployment initiation, missing deploymentId:', response);
            this.currentStatus = 'Failed to initiate deployment: Server did not return a deployment ID.';
            // Corrected ToastService call: pass the full message
            this.toastService.showError(this.currentStatus);
            this.isLoading = false;
            this.deploymentId = null; 
          }
        }),
        switchMap(() => { 
          if (this.deploymentId) { 
            return this.deployStatusService.pollStatus(this.deploymentId);
          }
          return of(null).pipe(
             tap(() => { if (this.isLoading) this.isLoading = false; this.isPolling = false; }), 
             switchMap(() => new Subject<DeploymentStatusResponse | null>()) 
          );
        }),
        takeUntil(this.pollingStop$), 
        takeUntil(this.destroy$),    
        finalize(() => {
          if (this.isLoading) this.isLoading = false;
          this.isPolling = false;
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Error in deployment process:', err);
          const backendError = err.error?.error || err.error?.message || err.message || 'An unknown error occurred.';
          this.errorMessage = backendError; 
          this.currentStatus = `Error: ${this.errorMessage}`;
          // Corrected ToastService call: pass the full message
          this.toastService.showError(this.errorMessage|| 'An unexpected error occurred during deployment.');

          const idForEvent = this.deploymentId || `unknown-for-${repoUrl}`;
          this.eventBus.emit({
            type: 'FAILED',
            deploymentId: idForEvent,
            message: this.errorMessage || 'Deployment process failed with an unspecified error.',  
            timestamp: new Date(),
            details: { errorObj: err }
          });
          this.isLoading = false; 
          this.isPolling = false;
          return of(null); 
        })
      )
      .subscribe({
        next: (statusResponse: any /* Type this with DeploymentStatusResponse */) => {
          if (!statusResponse) { 
            return;
          }

          this.currentStatus = statusResponse.message || statusResponse.status;
          this.deploymentUrl = statusResponse.url || null;
          const idForDisplay = this.deploymentId || 'N/A';

          const eventType = this.mapStatusToEventType(statusResponse.status);
          if (eventType && this.deploymentId) {
            this.eventBus.emit({
              type: eventType,
              deploymentId: this.deploymentId, 
              message: `Deployment ${this.deploymentId} status: ${statusResponse.status}. ${statusResponse.message || ''}`,
              timestamp: new Date(),
              details: { status: statusResponse.status, url: this.deploymentUrl, originalMessage: statusResponse.message }
            });
          }

          const upperStatus = statusResponse.status.toUpperCase();
          if (upperStatus === 'SUCCESS' || upperStatus === 'DEPLOYED') {
            // This call was already correct
            this.toastService.showSuccess(`Deployment Successful! ID: ${idForDisplay}`);
            this.pollingStop$.next(); 
          } else if (upperStatus === 'FAILED' || upperStatus === 'POLL_ERROR_SERVICE' || upperStatus === 'TIMEOUT_POLL') {
            const finalMessage = this.currentStatus || `Deployment polling failed for ID: ${idForDisplay}`;
            // Corrected ToastService call: pass the full message
            this.toastService.showError(finalMessage);
            this.errorMessage = finalMessage; 
            this.pollingStop$.next(); 
          }
        }
      });
  }

  private extractAppNameFromRepoUrl(repoUrl: string): string {
    try {
      const path = new URL(repoUrl).pathname;
      const parts = path.split('/');
      const lastPart = parts.pop() || parts.pop(); 
      return lastPart ? lastPart.replace('.git', '') : 'unknown-app';
    } catch (e) { return 'unknown-app'; }
  }

  private mapStatusToEventType(status?: string): DeploymentEvent['type'] | null {
    if (!status) return null;
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case 'SUCCESS': return 'SUCCEEDED';
      case 'DEPLOYED': return 'DEPLOYED';
      case 'FAILED': case 'ERROR': case 'POLL_ERROR_SERVICE': case 'TIMEOUT_POLL': return 'FAILED';
      case 'CLONING': case 'CLONING_COMPLETE': return 'CLONING';
      case 'BUILDING': case 'BUILD_COMPLETE': return 'BUILDING';
      case 'UPLOADING': case 'UPLOAD_COMPLETE': return 'UPLOADING';
      case 'PENDING': case 'QUEUED': case 'IN_PROGRESS': return 'STATUS_UPDATE';
      default: console.warn(`Unknown status for event mapping: ${status}`); return 'STATUS_UPDATE';
    }
  }

  private stopPollingAndCleanup(): void {
    this.pollingStop$.next(); this.pollingStop$.complete();
    this.destroy$.next(); this.destroy$.complete();
  }

  ngOnDestroy(): void { this.stopPollingAndCleanup(); }
}