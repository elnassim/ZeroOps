import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

interface LoginResponseDTO {
  userId: number; // Java Long maps to number in TypeScript
  email: string;
  token: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: any; // Replace 'any' with your user interface
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/api/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally, decode token to get user info or fetch user details
      // For now, let's assume if a token exists, we might have user data stored or fetch it.
      // If you store user details separately in localStorage:
      const storedUserDetails = localStorage.getItem('currentUser');
      if (storedUserDetails) {
        this.currentUserSubject.next(JSON.parse(storedUserDetails));
      } else {
        // If only token is stored, you might want to fetch user details from backend
        // or decode token if it contains user information.
        // For simplicity, if you don't store 'currentUser' separately upon login,
        // this part might just rely on the token's existence.
      }
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData);
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<LoginResponseDTO>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          // Assuming LoginResponseDTO contains user details like id and email
          // You might want to store a simplified user object or just the token
          // and derive user state from the token or a separate API call.
          const userDetails = { userId: response.userId, email: response.email };
          localStorage.setItem('currentUser', JSON.stringify(userDetails));
          this.currentUserSubject.next(userDetails);
        }
      })
    );
  }

  logout(): void {
    console.log('[AuthService] logout() called.');
    const tokenBefore = localStorage.getItem('token');
    console.log('[AuthService] Token BEFORE removal:', tokenBefore);

    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');

    const tokenAfter = localStorage.getItem('token');
    console.log('[AuthService] Token AFTER removal:', tokenAfter); // Should be null

    this.currentUserSubject.next(null);
    console.log('[AuthService] Navigating to /auth/login.');
    this.router.navigate(['/auth/login']);
    console.log('[AuthService] User logged out, token and user data cleared.');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    console.log('[AuthService] isAuthenticated() check. Token:', token, 'Result:', !!token);
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUserValue(): any {
    return this.currentUserSubject.value;
  }
}
