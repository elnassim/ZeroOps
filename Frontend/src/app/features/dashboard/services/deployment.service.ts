import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { type Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import type { Deployment, FrontendDeploymentStatus } from "../models/deployment.model"; // Ensure this path is correct
import { environment } from "../../../../environments/environment";
import { Page } from "../../../core/models/page.model";

// This interface represents the structure of the DTO coming from the backend
export interface BackendDeploymentDTO {
  id: number; // Database ID (Long in Java maps to number in TS)
  deploymentId: string;
  appName: string;
  branch: string;
  status: string; // Crucial for deployment status
  deploymentDate: string; // ISO date string (from LocalDateTime in Java)
  deployedUrl?: string; // The URL where the deployment is accessible, optional
  durationSeconds?: number;
  gitRepoUrl: string; // This is the field for the git URL
  errorMessage?: string;
   // Optional: if logs are sometimes embedded
}

// Updated DeployResponse interface as per your request
export interface DeployResponse {
  deploymentId: string;
  [key: string]: any; // This should be the UUID string
  // Add other relevant fields from your backend's DTO if needed
  // e.g., initialStatus, appName, etc.
}

// For GET /api/deployments/{deploymentId}/logs
export interface LogEntry {
  id?: number; // Log ID from backend
  timestamp: string; // ISO date string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  message: string;
}

// Interface for the parameters of the list method
export interface DeploymentListParams {
  page: number; // 0-indexed for backend
  size: number;
  status?: string[]; // For filtering by status
  branch?: string[];
  sort?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
}

@Injectable({
  providedIn: "root",
})
export class DeploymentService {
  // This apiUrl is already correct and points to /api/deployments
  private apiUrl = `${environment.apiUrl}/api/deployments`;

  private colorOptions = [
    "#3B82F6", "#8B5CF6", "#EC4899", "#10B981",
    "#F59E0B", "#EF4444", "#6366F1",
  ];

  constructor(private http: HttpClient) {}

  listDeployments(params: DeploymentListParams): Observable<Page<Deployment>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    if (params.status && params.status.length > 0) {
      params.status.forEach(s => {
        httpParams = httpParams.append('status', s.toUpperCase()); // Backend expects uppercase status
      });
    }
    if (params.branch && params.branch.length > 0) {
      params.branch.forEach(b => {
        httpParams = httpParams.append('branch', b);
      });
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    } else {
      httpParams = httpParams.set('sort', 'deploymentDate,desc'); // Default sort
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    // The GET request for listing deployments uses the correct apiUrl base
    return this.http.get<Page<BackendDeploymentDTO>>(this.apiUrl, { params: httpParams })
      .pipe(
        map(pageDto => ({
          ...pageDto,
          content: pageDto.content.map(dto => this.mapDtoToDeployment(dto))
        })),
        catchError(this.handleError) // Using the class's general handleError for this
      );
  }

  // Updated deploy method as per your request
  deploy(repoUrl: string, branch?: string, appName?: string): Observable<DeployResponse> {
    // Ensure the payload matches what your backend's GitRepoRequest expects
    const payload = {
      gitUrl: repoUrl,
      appName: appName || undefined, // Send appName if provided
      branch: branch || 'main' // Default branch if not provided, or send undefined if backend handles default
    };
    console.log('[DeploymentService - features/dashboard] Sending deploy request:', payload, 'to URL:', this.apiUrl);
    // POST request now uses this.apiUrl directly, which is `${environment.apiUrl}/api/deployments`
    return this.http.post<DeployResponse>(this.apiUrl, payload).pipe(
      catchError(err => {
        console.error('[DeploymentService - features/dashboard] An API error occurred in deploy method', err);
        // It's good practice to transform the error into a user-friendly message or rethrow a custom error
        // Using the error handling from your snippet for this specific method
        throw new Error(`Server error ${err.status}: ${err.statusText}`);
      })
    );
  }

  redeploy(deploymentId: string): Observable<DeployResponse> {
    // This already correctly uses `${this.apiUrl}/${deploymentId}/redeploy`
    return this.http.post<DeployResponse>(`${this.apiUrl}/${deploymentId}/redeploy`, {})
      .pipe(catchError(this.handleError)); // Using the class's general handleError
  }

  getLogs(deploymentId: string, limit = 50): Observable<LogEntry[]> {
    const params = new HttpParams().set('limit', limit.toString());
    // This already correctly uses `${this.apiUrl}/${deploymentId}/logs`
    return this.http.get<LogEntry[]>(`${this.apiUrl}/${deploymentId}/logs`, { params })
      .pipe(catchError(this.handleError)); // Using the class's general handleError
  }

  private mapDtoToDeployment(dto: BackendDeploymentDTO): Deployment {
    return {
      id: dto.id.toString(), // Map backend DB ID to string for frontend model
      deploymentId: dto.deploymentId,
      appName: dto.appName,
      iconBg: this.colorOptions[dto.id % this.colorOptions.length], // Consistent color based on ID
      branch: dto.branch,
      status: dto.status as FrontendDeploymentStatus, // Directly map status
      startedAt: this.getRelativeTimeString(new Date(dto.deploymentDate)),
      duration: dto.durationSeconds ?? 0,
      url: dto.deployedUrl, // Map deployedUrl to url, will be undefined if not present
    };
  }

  private getRelativeTimeString(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid date';
    }
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30.44);
    const years = Math.round(days / 365.25);

    if (seconds < 5) return `just now`;
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 5) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  }

  // General error handler for other methods in this service
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An API error occurred', error);
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      if (error.status === 0) {
        errorMessage = 'Cannot connect to the server. Please check your network connection or if the server is running.';
      } else if (error.error && typeof error.error === 'string') {
        errorMessage = `Error ${error.status}: ${error.error}`;
      } else if (error.error && error.error.message) {
        errorMessage = `Error ${error.status}: ${error.error.message}`;
      } else {
        errorMessage = `Server error ${error.status}: ${error.statusText}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}