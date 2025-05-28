import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, timer, throwError } from 'rxjs';
import { catchError, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import { Deployment } from '../models/deployment.model'; // Ensure this path is correct
import { environment } from '../../../environments/environment'; // Ensure this path is correct

// This DTO should match what your backend's /api/deployments endpoint returns for POST and GET (single item)
// It's crucial that this DTO reflects the backend's use of "deploymentId"
interface BackendDeploymentResponseDTO {
  id?: number; // Database primary key
  deploymentId: string; // This MUST be 'deploymentId' from backend
  appName: string;
  branch?: string; // Or version
  status: string;
  deploymentDate?: string; // ISO string
  deploymentUrl?: string | null;
  durationSeconds?: number;
  gitRepoUrl?: string; // Or whatever field your backend sends for the git URL
  errorMessage?: string;
  // Add any other fields the backend might return for a single deployment
}

@Injectable({
  providedIn: 'root'
})
export class DeploymentService {
  private apiUrl = `${environment.apiUrl}/api/deployments`;

  constructor(private http: HttpClient) { }

  // Method to map backend DTO to frontend Deployment model
  private mapToFrontendDeployment(dto: BackendDeploymentResponseDTO): Deployment {
    return {
      dbId: dto.id?.toString(),
      deploymentId: dto.deploymentId, // Critical mapping
      appName: dto.appName,
      branch: dto.branch || 'main', // Provide default if necessary
      status: dto.status ? dto.status.toLowerCase() : 'unknown',
      deploymentDate: dto.deploymentDate ? new Date(dto.deploymentDate) : new Date(),
      deploymentUrl: dto.deploymentUrl,
      durationSeconds: dto.durationSeconds,
      gitUrl: dto.gitRepoUrl, // Map from backend field
      errorMessage: dto.errorMessage,
      // url and iconBg might be frontend-specific or derived
      url: dto.deploymentUrl,
      // iconBg: this.getIconBgBasedOnStatus(dto.status), // Example
    };
  }

  initiateDeployment(gitUrl: string, appName?: string, branch?: string): Observable<Deployment> {
    const payload = {
      gitUrl: gitUrl,
      appName: appName,
      branch: branch || 'main'
    };
    return this.http.post<BackendDeploymentResponseDTO>(this.apiUrl, payload).pipe(
      map(responseDto => this.mapToFrontendDeployment(responseDto)),
      catchError(this.handleError)
    );
  }

  getDeployment(deploymentId: string): Observable<Deployment> {
    return this.http.get<BackendDeploymentResponseDTO>(`${this.apiUrl}/${deploymentId}`).pipe(
      map(responseDto => this.mapToFrontendDeployment(responseDto)),
      catchError((err: HttpErrorResponse) => { // Explicitly type err as HttpErrorResponse
        console.error(`[CoreDeploymentService] Error fetching deployment ${deploymentId}:`, err);

        let detailedErrorMessage = `Failed to fetch deployment details for ID: ${deploymentId}.`;
        if (err.error && typeof err.error === 'object' && err.error.message) {
          // Prefer the message from the backend's JSON error response body
          detailedErrorMessage = String(err.error.message);
        } else if (err.error && typeof err.error === 'string') {
          // If the backend error response body is a plain string
          detailedErrorMessage = err.error;
        } else if (err.message) {
          // Fallback to the HttpErrorResponse's message property (often the status text)
          detailedErrorMessage = err.message;
        }

        const errorDeployment: Deployment = {
          deploymentId: deploymentId,
          status: 'POLL_ERROR', // A specific status indicating a fetch error
          appName: 'Unknown (Error)',
          branch: 'unknown', // Ensure this required field is present
          deploymentUrl: null, // This is valid if your Deployment model allows null for deploymentUrl
          deploymentDate: new Date(), // Or undefined, or a specific error date
          errorMessage: detailedErrorMessage, // Use the more specific error message
          // Initialize other optional fields from Deployment model as undefined or null
          dbId: undefined,
          durationSeconds: undefined,
          gitUrl: undefined,
          iconBg: undefined,
          startedAt: undefined,
          duration: undefined,
          url: null, // Consistent with deploymentUrl for an error state
        };
        return of(errorDeployment);
      })
    );
  }

  pollDeploymentStatus(deploymentId: string): Observable<Deployment> {
    return timer(0, 5000).pipe( // Poll immediately, then every 5 seconds
      switchMap(() => this.getDeployment(deploymentId)),
      tap(deployment => {
        console.log(`[CoreDeploymentService] Polling for ${deploymentId}: Status is '${deployment.status}', URL: ${deployment.deploymentUrl}`);
      }),
      takeWhile(deployment => {
        const status = deployment.status ? deployment.status.toLowerCase() : '';
        // Define processing states carefully.
        // These should align with the states where polling should continue.
        const isProcessing = status === 'processing' ||
                             status === 'pending' ||
                             status === 'queued' ||
                             status === 'cloning' ||
                             status === 'cloning_complete' ||
                             status === 'building' ||
                             status === 'build_complete' ||
                             status === 'uploading' ||
                             status === 'upload_complete';
        console.log(`[CoreDeploymentService] takeWhile check for ${deploymentId}: current status '${status}', isProcessing: ${isProcessing}`);
        return isProcessing;
      }, true), // true to include the emission that causes the condition to be false
      tap({
        next: deployment => console.log(`[CoreDeploymentService] Emitting after takeWhile for ${deploymentId}: Status - '${deployment.status}'`),
        complete: () => console.log(`[CoreDeploymentService] Polling observable COMPLETED for ${deploymentId}.`),
        error: err => console.error(`[CoreDeploymentService] Polling observable ERRORED for ${deploymentId}`, err)
      }),
      catchError(this.handleError) // Catch errors from the polling stream itself
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred in CoreDeploymentService!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server returned code ${error.status}, error message is: ${error.message || error.statusText}`;
      if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage += ` - ${error.error.message}`;
      } else if (typeof error.error === 'string') {
        errorMessage += ` - ${error.error}`;
      }
    }
    console.error('[CoreDeploymentService] API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}