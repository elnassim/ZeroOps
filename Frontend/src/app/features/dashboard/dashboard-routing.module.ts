// filepath: Frontend/src/app/features/dashboard/dashboard-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './components/layout/dashboard-layout/dashboard-layout.component';
import { DashboardComponent } from './pages/dashboard.component';
// Import other dashboard page components if you create more (e.g., ProjectsComponent, SettingsComponent)
import { DeploymentsPageComponent } from './pages/deployments-page/deployments.component'; 
import { NewDeploymentPageComponent } from './pages/new-deployment-page/new-deployment-page.component';
import { LogsPageComponent } from './pages/logs-page/logs-page.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent, // This layout wraps all dashboard pages
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardComponent },
      { path: 'deployments', component: DeploymentsPageComponent },
      { path: 'deployments/new', component: NewDeploymentPageComponent },
      { path: 'logs', component: LogsPageComponent, title: 'Deployment Logs' }, // ADD THIS LINE
      
      // Example: { path: 'projects', component: ProjectsPageComponent },
      // Example: { path: 'settings', component: SettingsPageComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }