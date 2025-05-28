// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Frontend\src\app\core\guards\public.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // If user is authenticated, redirect them away from public-only pages (e.g., to dashboard)
    router.navigate(['/dashboard']);
    return false;
  }

  // If user is not authenticated, allow access
  return true;
};