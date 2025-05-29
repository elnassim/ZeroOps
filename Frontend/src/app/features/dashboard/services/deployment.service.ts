import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { type Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
// Ensure this Deployment model is the one you intend to use for the dashboard feature
import type { Deployment, FrontendDeploymentStatus } from "../models/deployment.model";
import { environment } from "../../../../environments/environment";
import { Page } from "../../../core/models/page.model";
// Use the BackendDeploymentDTO from the core models
import type { BackendDeploymentDTO as CoreBackendDeploymentDTO } from '../../../core/models/deployment.model';

// REMOVE THE LOCAL DEFINITION of BackendDeploymentDTO that was here

export interface DeployResponse { // Matches backend DTO
  deploymentId: string;
  message: string;
  deploymentUrl?: string;
  status?: string;
}

export interface LogEntry {
  id?: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  message: string;
}

export interface DeploymentListParams {
  page: number;
  size: number;
  status?: string[];
  branch?: string[];
  sort?: string;
  startDate?: string;
  endDate?: string;
  // Add appName if your backend supports filtering by it for the list
  appName?: string;
}

@Injectable({
  providedIn: "root",
})
export class DeploymentService {
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

    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params.status && params.status.length > 0) {
      httpParams = httpParams.set('status', params.status.join(','));
    }
    if (params.branch && params.branch.length > 0) {
        httpParams = httpParams.set('branch', params.branch.join(','));
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params.appName) {
      httpParams = httpParams.set('appName', params.appName);
    }

    return this.http.get<Page<CoreBackendDeploymentDTO>>(`${this.apiUrl}`, { params: httpParams })
      .pipe(
        map((pageDto: Page<CoreBackendDeploymentDTO>) => ({
          ...pageDto,
          content: pageDto.content.map((dto: CoreBackendDeploymentDTO) => this.mapDtoToDeployment(dto))
        })),
        catchError(this.handleError)
      );
  }

  deploy(repoUrl: string, branch?: string, appName?: string): Observable<DeployResponse> {
    const payload = { repoUrl, branch: branch || 'main', appName };
    return this.http.post<DeployResponse>(`${environment.apiUrl}/api/deploy`, payload)
      .pipe(catchError(this.handleError));
  }

  redeploy(deploymentId: string): Observable<DeployResponse> {
    return this.http.post<DeployResponse>(`${this.apiUrl}/${deploymentId}/redeploy`, {})
      .pipe(catchError(this.handleError));
  }

  getLogs(deploymentId: string, limit = 50): Observable<LogEntry[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<LogEntry[]>(`${this.apiUrl}/${deploymentId}/logs`, { params })
      .pipe(catchError(this.handleError));
  }

  private mapDtoToDeployment(dto: CoreBackendDeploymentDTO): Deployment {
    // The 'id' from CoreBackendDeploymentDTO is the string UUID (deploymentId)
    // The 'Deployment' model in 'features/dashboard/models/deployment.model.ts'
    // uses 'id' for its primary identifier and also has 'deploymentId'.
    // We need to ensure these are mapped correctly based on intention.
    // Assuming dto.id (UUID) should map to Deployment.id (which is also the deploymentId).
    return {
      id: dto.id, // This is the string UUID from backend (deploymentId)
      deploymentId: dto.id, // Explicitly map to deploymentId as well if your dashboard model uses it
      repoUrl: dto.repoUrl,
      branch: dto.branch,
      status: dto.status.toUpperCase() as FrontendDeploymentStatus, // Cast if necessary, ensure FrontendDeploymentStatus includes all possibilities
      appName: dto.appName || 'N/A', // Provide a default for appName if it's optional in DTO but required in model
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      userId: dto.userId,
      deploymentUrl: dto.deploymentUrl,
      // Properties from dashboard/models/deployment.model.ts that are not in CoreBackendDeploymentDTO
      // need to be handled (e.g., iconBg, startedAt, duration, url, gitUrl).
      // For now, they will be undefined if not mapped.
      // Example for iconBg (if you have logic for it):
      iconBg: this.colorOptions[Math.floor(Math.random() * this.colorOptions.length)], // Placeholder for iconBg
      // startedAt and duration would need to come from backend or be derived.
      // If 'url' in dashboard model is same as 'deploymentUrl', map it.
      url: dto.deploymentUrl,
      // If 'gitUrl' in dashboard model is same as 'repoUrl', map it.
      gitUrl: dto.repoUrl,
      // Ensure all required fields of 'Deployment' are covered.
      // 'startedAt' and 'duration' from the dashboard model are not in CoreBackendDeploymentDTO.
      // They will be undefined unless you add them or derive them.
      startedAt: dto.createdAt, // Or a more specific 'startedAt' field if backend provides it
      duration: 0, // Placeholder, backend DTO from core/models doesn't have durationSeconds
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