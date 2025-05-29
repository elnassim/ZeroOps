import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SortingService } from '../../../../core/services/sorting.service';
import { SortByDate } from '../../../../core/sorting/strategies/sort-by-date';
import { SortByStatus } from '../../../../core/sorting/strategies/sort-by-status';
import { SortByBranch } from '../../../../core/sorting/strategies/sort-by-branch';
import { SortingStrategy } from '../../../../core/sorting/sorting-strategy';

import { FilterHandler } from '../../../../core/filters/filter-handler';
import { StatusFilter } from '../../../../core/filters/handlers/status-filter';
import { BranchFilter } from '../../../../core/filters/handlers/branch-filter';
import { DateRangeFilter } from '../../../../core/filters/handlers/date-range-filter';

import { DeploymentListParams } from '../../services/deployment.service';
import type { Deployment } from '../../models/deployment.model';
import { Page } from '../../../../core/models/page.model';
import {
  FilterPanelComponent,
  FilterPanelOutput,
} from './components/filter-panel/filter-panel.component';
import { DeploymentListComponent } from './components/deployment-list/deployment-list.component';

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

  deploymentsPage$: Observable<Page<Deployment> | null>;
  isLoading$: Observable<boolean>;

  displayedDeployments: Deployment[] = [];
  private rawCurrentPageDeployments: Deployment[] = [];
  currentPageForTemplate = 1;
  totalItemsForTemplate = 0;
  pageSizeForTemplate = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  currentApiFilterParams: DeploymentListParams = {
    page: 0,
    size: this.pageSizeForTemplate,
    status: [],
    branch: [],
    startDate: undefined,
    endDate: undefined,
  };

  private currentFilterPanelOutput: FilterPanelOutput = { // Initialize for client-side chain
    status: [],
    selectedApp: null,
    selectedBranch: null,
    startDate: null,
    endDate: null,
  };

  applications: string[] = []; // Consider populating via facade
  branches: string[] = [];   // Consider populating via facade
  initialPanelFilters: FilterPanelOutput = { ...this.currentFilterPanelOutput }; // For filter panel reset

  viewMode: 'table' | 'card' = 'table';
  private readonly mobileBreakpoint = 768;
  private currentSortValue: string = 'date';

  constructor(
    private deploymentsFacade: DeploymentsFacadeService,
    private toastService: ToastService,
    private router: Router,
    private sortingService: SortingService
  ) {
    this.deploymentsPage$ = this.deploymentsFacade.deploymentsPage$;
    this.isLoading$ = this.deploymentsFacade.isLoading$;
    this.checkViewMode();
  }

  ngOnInit(): void {
    this.fetchDeployments();

    this.deploymentsPage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((page) => {
        console.log('[DeploymentsPageComponent] Received page data from API:', page);
        if (page) {
          this.rawCurrentPageDeployments = page.content;
          this.currentPageForTemplate = page.number + 1;
          this.totalItemsForTemplate = page.totalElements;
          this.pageSizeForTemplate = page.size;
          this.applyClientSideFiltersAndSort();
        } else {
          this.rawCurrentPageDeployments = [];
          this.displayedDeployments = [];
          this.currentPageForTemplate = 1;
          this.totalItemsForTemplate = 0;
        }
      });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.checkViewMode.bind(this));
    }
  }

  private checkViewMode(): void {
    if (typeof window !== 'undefined') {
      this.viewMode = window.innerWidth < this.mobileBreakpoint ? 'card' : 'table';
    }
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'card' : 'table';
  }

  fetchDeployments(): void {
    // Update API params from the currentFilterPanelOutput for backend filtering
    this.currentApiFilterParams.page = this.currentPageForTemplate - 1;
    this.currentApiFilterParams.size = this.pageSizeForTemplate;
    this.currentApiFilterParams.status = this.currentFilterPanelOutput.status;
    this.currentApiFilterParams.branch = this.currentFilterPanelOutput.selectedBranch
      ? [this.currentFilterPanelOutput.selectedBranch]
      : [];
    this.currentApiFilterParams.startDate = this.currentFilterPanelOutput.startDate
      ? new Date(this.currentFilterPanelOutput.startDate).toISOString()
      : undefined;
    this.currentApiFilterParams.endDate = this.currentFilterPanelOutput.endDate
      ? new Date(this.currentFilterPanelOutput.endDate).toISOString()
      : undefined;
    // Note: App filter (selectedApp) is not used in currentApiFilterParams here.

    console.log('[DeploymentsPageComponent] Fetching deployments with API params:', JSON.stringify(this.currentApiFilterParams));
    this.deploymentsFacade.loadDeployments(this.currentApiFilterParams);
  }

  onFiltersChanged(filtersFromPanel: FilterPanelOutput): void {
    this.currentFilterPanelOutput = filtersFromPanel;
    this.currentPageForTemplate = 1; // Reset to first page on filter change
    this.fetchDeployments(); // Fetch data from backend using these filters
    // The subscription to deploymentsPage$ will then call applyClientSideFiltersAndSort
  }

  private applyClientSideFiltersAndSort() {
    if (!this.rawCurrentPageDeployments) {
      this.displayedDeployments = [];
      return;
    }

    let itemsToProcess = [...this.rawCurrentPageDeployments];

    // Build and apply the client-side filter chain
    const statusHandler = new StatusFilter(this.currentFilterPanelOutput.status);
    const branchHandler = new BranchFilter(this.currentFilterPanelOutput.selectedBranch);
    const dateHandler = new DateRangeFilter(
      this.currentFilterPanelOutput.startDate,
      this.currentFilterPanelOutput.endDate
    );
    // Add other client-side filters here if needed (e.g., appName if not backend filtered)

    // Chain them: status -> branch -> date
    statusHandler
      .setNext(branchHandler)
      .setNext(dateHandler);

    itemsToProcess = statusHandler.handle(itemsToProcess);

    // Now apply sorting to the client-side filtered list
    this.applySortStrategyToItems(itemsToProcess);
  }

  onPageChanged(page: number): void {
    this.currentPageForTemplate = page;
    this.fetchDeployments();
  }

  onPageSizeChanged(newPageSize: number): void {
    this.pageSizeForTemplate = newPageSize;
    this.currentPageForTemplate = 1;
    this.fetchDeployments();
  }

  onSortChange(sortValue: string) {
    this.currentSortValue = sortValue;
    this.applyClientSideFiltersAndSort(); // Re-apply filters then sort with new strategy
  }

  private applySortStrategyToItems(itemsToSort: Deployment[]) {
    if (!itemsToSort || itemsToSort.length === 0) {
      this.displayedDeployments = [];
      return;
    }
    let strategy: SortingStrategy<Deployment>;
    switch (this.currentSortValue) {
      case 'status':
        strategy = new SortByStatus();
        break;
      case 'branch':
        strategy = new SortByBranch();
        break;
      case 'date':
      default:
        strategy = new SortByDate();
        break;
    }
    this.sortingService.setStrategy(strategy);
    this.displayedDeployments = this.sortingService.applyStrategy(itemsToSort);
  }

  handleDeploymentAction(
    actionType: 'started' | 'finished' | 'redeploy' | 'viewLogs',
    data?: any
  ): void {
    const deploymentId = data as string;

    if (actionType === 'redeploy' && deploymentId) {
      this.toastService.showInfo(`Redeploying ${deploymentId}...`);
      this.deploymentsFacade
        .redeployAndPoll(deploymentId)
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe({
          next: (statusResponse: { status: string }) => {
            if (
              statusResponse.status === 'SUCCESS' ||
              statusResponse.status === 'FAILED' ||
              statusResponse.status === 'DEPLOYED'
            ) {
              this.toastService.showSuccess(
                `Redeployment of ${deploymentId} ${statusResponse.status.toLowerCase()}.`
              );
              this.fetchDeployments();
            }
          },
          error: (err: any) => {
            console.error('Redeploy error from facade:', err);
            this.toastService.showError(`Redeploy failed for ${deploymentId}.`);
            this.fetchDeployments();
          },
        });
    } else if (actionType === 'viewLogs' && deploymentId) {
      this.router.navigate(['/dashboard/deployments', deploymentId, 'logs']);
    } else if (actionType === 'finished') {
      if (data?.deploymentId) {
        console.log(
          `Child component finished action for ${data.deploymentId} (Success: ${data.success}).`
        );
      }
      this.fetchDeployments();
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