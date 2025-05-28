import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// This interface defines the structure of the object emitted by filterChange
export interface FilterPanelOutput {
  status: string[]; // Array of active status strings (e.g., ["SUCCESS", "FAILED", "BUILDING"])
  selectedApp: string | null;
  selectedBranch: string | null; // For single branch filter
  startDate: string | null;
  endDate: string | null;
}

@Component({
  selector: "app-filter-panel",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./filter-panel.component.html",
  styleUrls: ["./filter-panel.component.scss"],
})
export class FilterPanelComponent implements OnInit, OnChanges {
  // Expects the full initial filter state from the parent component.
  @Input() initialFilters!: FilterPanelOutput;

  // Expects a list of application names (strings) for the dropdown.
  @Input() availableApps: string[] = [];
  @Input() availableBranches: string[] = []; // New input for branches

  // Emits the current filter state whenever a filter changes.
  @Output() filterChange = new EventEmitter<FilterPanelOutput>();

  // Internal state for the form controls, bound to the template.
  statusFiltersInternal!: { all: boolean; success: boolean; building: boolean; failed: boolean };
  selectedAppInternal: string | null = null;
  selectedBranchInternal: string | null = null; // New internal state for branch
  startDateInternal: string | null = null;
  endDateInternal: string | null = null;

  constructor() {}

  ngOnInit(): void {
    // Initialize internal filters when the component is created.
    this.initializeFiltersFromInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize if the initialFilters input changes from the parent.
    if (changes['initialFilters'] && changes['initialFilters'].currentValue) {
      this.initializeFiltersFromInput();
    }
  }

  private initializeFiltersFromInput(): void {
    if (this.initialFilters) {
      const initialStatuses = this.initialFilters.status || [];
      const allChecked = initialStatuses.length === 0;

      this.statusFiltersInternal = {
        all: allChecked,
        success: !allChecked && initialStatuses.includes("SUCCESS"),
        building: !allChecked && initialStatuses.includes("BUILDING"), // Maps to "building" status from backend DTO
        failed: !allChecked && initialStatuses.includes("FAILED"),
      };

      this.selectedAppInternal = this.initialFilters.selectedApp;
      this.selectedBranchInternal = this.initialFilters.selectedBranch;
      this.startDateInternal = this.initialFilters.startDate || null;
      this.endDateInternal = this.initialFilters.endDate || null;
    } else {
      // Default initialization
      this.statusFiltersInternal = { all: true, success: false, building: false, failed: false };
      this.selectedAppInternal = null;
      this.selectedBranchInternal = null;
      this.startDateInternal = null;
      this.endDateInternal = null;
    }
  }

  onStatusFilterChange(): void {
    if (this.statusFiltersInternal.all) {
      this.statusFiltersInternal.success = false;
      this.statusFiltersInternal.building = false;
      this.statusFiltersInternal.failed = false;
    } else {
      if (this.statusFiltersInternal.success || this.statusFiltersInternal.building || this.statusFiltersInternal.failed) {
        this.statusFiltersInternal.all = false;
      } else {
        this.statusFiltersInternal.all = true;
      }
    }
    this.emitFilters();
  }

  onAppChange(): void {
    this.emitFilters();
  }

  onBranchChange(): void {
    this.emitFilters();
  }

  onDateChange(): void {
    this.emitFilters();
  }

  resetFilters(): void {
    this.statusFiltersInternal = { all: true, success: false, building: false, failed: false };
    this.selectedAppInternal = null;
    this.selectedBranchInternal = null;
    this.startDateInternal = null;
    this.endDateInternal = null;
    this.emitFilters();
  }

  private emitFilters(): void {
    const activeStatuses: string[] = [];
    if (!this.statusFiltersInternal.all) {
      if (this.statusFiltersInternal.success) activeStatuses.push("SUCCESS");
      if (this.statusFiltersInternal.building) activeStatuses.push("BUILDING"); // This should match what backend expects or what DeploymentsPageComponent maps
      if (this.statusFiltersInternal.failed) activeStatuses.push("FAILED");
    }

    const currentFilterState: FilterPanelOutput = {
      status: activeStatuses,
      selectedApp: this.selectedAppInternal,
      selectedBranch: this.selectedBranchInternal,
      startDate: this.startDateInternal || null,
      endDate: this.endDateInternal || null,
    };
    this.filterChange.emit(currentFilterState);
  }
}