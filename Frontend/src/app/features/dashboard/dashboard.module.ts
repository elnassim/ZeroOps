// filepath: Frontend/src/app/features/dashboard/dashboard.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';

// Layout Components
import { DashboardLayoutComponent } from './components/layout/dashboard-layout/dashboard-layout.component';
import { HeaderComponent } from './components/layout/header/header.component';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';
import { FooterComponent } from './components/layout/footer/footer.component'; // If used

// Page Components
import { DashboardComponent } from './pages/dashboard.component';

// Dashboard Specific Components
import { StatsCardComponent } from './components/stats-card/stats-card.component';
import { DeploymentsTableComponent } from './components/deployments-table/deployments-table.component';
import { MetricsPanelComponent } from './components/metrics-panel/metrics-panel.component';
import { LogsPreviewComponent } from './components/logs-preview/logs-preview.component';
// Import other necessary Angular modules (e.g., FormsModule, ReactiveFormsModule if needed by these components)

@NgModule({
  
  imports: [
    CommonModule,
    DashboardRoutingModule
    // Add other modules like HttpClientModule if services make HTTP calls and are provided here
  ]
})
export class DashboardModule { }