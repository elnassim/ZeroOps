import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

import { DeploymentListParams } from '../../services/deployment.service';
import type { Deployment } from '../../models/deployment.model';
import { Page } from '../../../../core/models/page.model';
import {
  FilterPanelComponent,
  FilterPanelOutput,
} from './components/filter-panel/filter-panel.component';
import { DeploymentListComponent } from './components/deployment-list/deployment-list.component';

// Import Facade and Toast Service
import { DeploymentsFacadeService } from '../../services/deployments-facade.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-deployments-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FilterPanelComponent,
    DeploymentListComponent,
  ],
  templateUrl: './deployments.component.html',
  styleUrls: ['./deployments.component.scss'],
})
export class DeploymentsPageComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject<void>();

  // Observables from Facade
  deploymentsPage$: Observable<Page<Deployment> | null>;
  isLoading$: Observable<boolean>;

  // Local state for template binding
  displayedDeployments: Deployment[] = [];
  currentPageForTemplate = 1; // 1-indexed for UI
  totalItemsForTemplate = 0;
  pageSizeForTemplate = 10;

  pageSizeOptions: number[] = [5, 10, 25, 50];

  // Filters are managed by the facade or passed directly
  currentApiFilterParams: DeploymentListParams = {
    page: 0, // API is 0-indexed, will be set in fetchDeployments
    size: this.pageSizeForTemplate, // Initial size
    status: [],
    branch: [],
    startDate: undefined,
    endDate: undefined,
  };

  // These might be fetched via facade or a separate service if they are dynamic
  applications: string[] = [];
  branches: string[] = [];

  initialPanelFilters: FilterPanelOutput = {
    status: [],
    selectedApp: null,
    selectedBranch: null,
    startDate: null,
    endDate: null,
  };

  viewMode: 'table' | 'card' = 'table';
  private readonly mobileBreakpoint = 768;

  constructor(
    private deploymentsFacade: DeploymentsFacadeService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.deploymentsPage$ = this.deploymentsFacade.deploymentsPage$;
    this.isLoading$ = this.deploymentsFacade.isLoading$;
    this.checkViewMode();
  }

  ngOnInit(): void {
    this.fetchDeployments(); // Initial fetch

    this.deploymentsPage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((page) => {
        console.log(
          '[DeploymentsPageComponent] Received page data from API:',
          page
        );
        if (page) {
          this.displayedDeployments = page.content;
          this.currentPageForTemplate = page.number + 1; // Convert 0-indexed from API to 1-indexed for UI
          this.totalItemsForTemplate = page.totalElements;
          this.pageSizeForTemplate = page.size;
        } else {
          this.displayedDeployments = [];
          this.currentPageForTemplate = 1;
          this.totalItemsForTemplate = 0;
        }
      });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.checkViewMode.bind(this));
    }
    // TODO: Populate 'applications' and 'branches' for the filter panel, possibly via facade.
  }

  private checkViewMode(): void {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < this.mobileBreakpoint) {
        this.viewMode = 'card';
      } else {
        this.viewMode = 'table';
      }
    }
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'card' : 'table';
  }

  fetchDeployments(): void {
    this.currentApiFilterParams.page = this.currentPageForTemplate - 1; // API is 0-indexed
    this.currentApiFilterParams.size = this.pageSizeForTemplate;
    console.log(
      '[DeploymentsPageComponent] Fetching deployments with params:',
      JSON.stringify(this.currentApiFilterParams)
    ); // <<< ADD THIS LOG
    this.deploymentsFacade.loadDeployments(this.currentApiFilterParams);
  }

  onFiltersChanged(filtersFromPanel: FilterPanelOutput): void {
    this.currentApiFilterParams.status = filtersFromPanel.status;
    this.currentApiFilterParams.branch = filtersFromPanel.selectedBranch
      ? [filtersFromPanel.selectedBranch]
      : [];
    this.currentApiFilterParams.startDate = filtersFromPanel.startDate
      ? new Date(filtersFromPanel.startDate).toISOString()
      : undefined;
    this.currentApiFilterParams.endDate = filtersFromPanel.endDate
      ? new Date(filtersFromPanel.endDate).toISOString()
      : undefined;
    // TODO: Add appName filtering if backend supports it, update currentApiFilterParams

    this.currentPageForTemplate = 1; // Reset to first page on filter change
    this.fetchDeployments();
  }

  onPageChanged(page: number): void {
    // page is 1-indexed from component
    this.currentPageForTemplate = page;
    this.fetchDeployments();
  }

  onPageSizeChanged(newPageSize: number): void {
    this.pageSizeForTemplate = newPageSize;
    this.currentPageForTemplate = 1; // Reset to first page on size change
    this.fetchDeployments();
  }

  handleDeploymentAction(
    actionType: 'started' | 'finished' | 'redeploy' | 'viewLogs',
    data?: any
  ): void {
    const deploymentId = data as string; // Assuming data is deploymentId for these actions

    if (actionType === 'redeploy' && deploymentId) {
      this.toastService.showInfo(`Redeploying ${deploymentId}...`);
      this.deploymentsFacade
        .redeployAndPoll(deploymentId)
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: (statusResponse: { status: string }) => {
            if (
              statusResponse.status === 'SUCCESS' ||
              statusResponse.status === 'FAILED'
            ) {
              this.toastService.showSuccess(
                `Redeployment of ${deploymentId} ${statusResponse.status.toLowerCase()}.`
              );
              this.fetchDeployments(); // Refresh list
            }
          },
          error: (err: any) => {
            console.error('Redeploy error from facade:', err);
            this.toastService.showError(`Redeploy failed for ${deploymentId}.`);
            this.fetchDeployments(); // Refresh list to show potential 'failed' state
          },
        });
    } else if (actionType === 'viewLogs' && deploymentId) {
      this.router.navigate(['/dashboard/deployments', deploymentId, 'logs']);
    } else if (actionType === 'finished') {
      // This might be from the child component's own polling after an action it initiated.
      // If the facade handles all polling, this specific branch might be less needed here.
      if (data?.deploymentId) {
        console.log(
          `Child component finished action for ${data.deploymentId} (Success: ${data.success}).`
        );
      }
      this.fetchDeployments(); // Refresh to be sure
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.checkViewMode.bind(this));
    }
  }
}
