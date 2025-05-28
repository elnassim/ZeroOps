import { Routes } from '@angular/router';
// Ensure your guards are correctly defined (preferably as functional guards)
// and exported from './core/guards/index.ts' or their respective files.
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { DeploymentFormComponent } from './features/deployments/deployment-form/deployment-form.component';
import { LogsPageComponent } from './features/dashboard/pages/logs-page/logs-page.component';


export const routes: Routes = [
  {
    path: '',
    // Changed from loadChildren to loadComponent for the standalone LandingPageComponent
    loadComponent: () => import('./features/landing/pages/landing-page/landing-page.component').then(m => m.LandingPageComponent)
  },
  {
    path: 'auth',
    canActivate: [publicGuard],
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
    
  },
  {
    path: 'deploy', // Example route
    component: DeploymentFormComponent
  },
  
  { path: '**', redirectTo: '' } // Wildcard route for unmatched paths
];