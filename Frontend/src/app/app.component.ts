import { Component } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationError, NavigationCancel, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common'; // Often useful, good to have
import { ToastComponent } from './core/components/toast/toast.component'; // Import ToastComponent

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ToastComponent // Add ToastComponent here
  ],
  templateUrl: './app.component.html', // This will use your existing app.component.html file
  styleUrls: ['./app.component.scss']  // Assuming you have this file, or it can be empty
})
export class AppComponent {
  title = 'ZeroOps';

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('[Router Event] NavigationStart to:', event.url);
      }
      if (event instanceof NavigationEnd) {
        console.log('[Router Event] NavigationEnd at:', event.url, 'after redirects to:', event.urlAfterRedirects);
      }
      if (event instanceof NavigationError) {
        console.error('[Router Event] NavigationError:', event.error, 'while navigating to:', event.url);
      }
      if (event instanceof NavigationCancel) {
        console.warn('[Router Event] NavigationCancel for:', event.url, 'Reason:', event.reason);
      }
    });
  }
}