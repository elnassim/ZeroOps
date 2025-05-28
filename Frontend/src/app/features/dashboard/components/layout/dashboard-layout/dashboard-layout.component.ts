// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Frontend\src\app\features\dashboard\components\layout\dashboard-layout\dashboard-layout.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Needed for <router-outlet>
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component'; // Adjusted path
import { SidebarComponent } from '../sidebar/sidebar.component'; // Adjusted path
import { FooterComponent } from '../footer/footer.component'; // Adjusted path - if you use it

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Import RouterModule
    HeaderComponent,
    SidebarComponent,
    FooterComponent // Add if you intend to use a dashboard-specific footer
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent {
  isSidebarCollapsed = false; // Example state for sidebar

  onToggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}