import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { switchMap, tap, finalize, shareReplay, takeUntil, startWith, map } from 'rxjs/operators';
import { DeploymentService, DeploymentListParams, DeployResponse, LogEntry } from './deployment.service';
import { DeployStatusService, DeploymentStatusResponse } from './deploy-status.service';
import { Page } from '../../../core/models/page.model';
import { Deployment } from '../models/deployment.model'; // Ensure this path is correct

@Injectable({
  providedIn: 'root'
})
export class DeploymentsFacadeService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  private deploymentsPageSubject = new BehaviorSubject<Page<Deployment> | null>(null);
  deploymentsPage$ = this.deploymentsPageSubject.asObservable();

  constructor(
    private deploymentService: DeploymentService,
    private deployStatusService: DeployStatusService
  ) {}

  loadDeployments(params: DeploymentListParams): void {
    this.isLoadingSubject.next(true);
    this.deploymentService.listDeployments(params).pipe(
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe({
      next: page => this.deploymentsPageSubject.next(page),
      error: err => {
        console.error("Error loading deployments via facade:", err);
        this.deploymentsPageSubject.next(null); // Or handle error appropriately
      }
    });
  }

  redeployAndPoll(deploymentId: string): Observable<DeploymentStatusResponse> {
    this.isLoadingSubject.next(true); 
    return this.deploymentService.redeploy(deploymentId).pipe(
      tap(response => console.log('Facade: Redeploy initiated', response)),
      switchMap(response => this.deployStatusService.pollStatus(response.deploymentId)),
      finalize(() => {
        // Consider a more granular loading state if redeploy is long and doesn't block all deployments loading
        this.isLoadingSubject.next(false); 
      })
    );
  }

  getLogs(deploymentId: string, limit?: number): Observable<LogEntry[]> {
    // You might want loading indicators for logs too
    return this.deploymentService.getLogs(deploymentId, limit);
  }

  // If you need to deploy new applications through the facade
  deployNewAndPoll(repoUrl: string, branch: string): Observable<DeploymentStatusResponse> {
    this.isLoadingSubject.next(true);
    return this.deploymentService.deploy(repoUrl, branch).pipe(
      tap(response => console.log('Facade: New deployment initiated', response)),
      switchMap(response => this.deployStatusService.pollStatus(response.deploymentId)),
      finalize(() => this.isLoadingSubject.next(false))
    );
  }
}