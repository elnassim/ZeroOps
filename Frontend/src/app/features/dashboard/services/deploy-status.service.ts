import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, map, retry, delay, tap, BehaviorSubject, distinctUntilChanged, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { DeploymentEventService, DeploymentEvent } from '../../../core/services/deployment-event.service'; // Import

export interface DeploymentStatusResponse {
  deploymentId: string;
  status: string;
  url?: string | null; // Corrected: Can be string, null, or undefined
  message?: string;
}

// This interface represents the structure of the DTO from your backend
// (com.example.zeroops.dto.DeploymentDTO)
interface BackendDeploymentDTO {
  id?: number; // Assuming it might be there
  deploymentId: string;
  appName?: string;
  branch?: string; // In backend DTO, this is 'version' or 'branch'
  status: string; // e.g., "processing", "deployed", "failed"
  deploymentDate?: string | Date;
  durationSeconds?: number;
  deploymentUrl?: string | null; // This is the key field for the live URL
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeployStatusService {
  private apiUrl = environment.apiUrl; // e.g., http://localhost:8080

  // Optional: Subject to broadcast status updates globally if needed by multiple components
  private deploymentStatusSubject = new BehaviorSubject<DeploymentStatusResponse | null>(null);
  public deploymentStatus$ = this.deploymentStatusSubject.asObservable().pipe(
    distinctUntilChanged((prev, curr) =>
      prev?.status === curr?.status &&
      prev?.deploymentId === curr?.deploymentId &&
      prev?.url === curr?.url // Also consider URL changes
    )
  );

  constructor(
    private http: HttpClient,
    private eventBus: DeploymentEventService // Inject
  ) { }

  /**
   * Fetches the full deployment details from the backend and maps it to DeploymentStatusResponse.
   * This is the method that should get the deploymentUrl.
   * @param deploymentId The UUID of the deployment.
   */
  private getDeploymentDetailsInternal(deploymentId: string): Observable<DeploymentStatusResponse> {
    // This endpoint should return the BackendDeploymentDTO
    return this.http.get<BackendDeploymentDTO>(`${this.apiUrl}/api/deployments/${deploymentId}`).pipe(
      map(dto => {
        // Map BackendDeploymentDTO to DeploymentStatusResponse
        console.log(`[DeployStatusService] Raw DTO for ${deploymentId}:`, dto);
        return {
          deploymentId: dto.deploymentId,
          status: dto.status, // Backend DTO status is already "processing", "deployed", etc.
          url: dto.deploymentUrl, // Directly map deploymentUrl
          message: dto.errorMessage // Or any other relevant message field
        } as DeploymentStatusResponse;
      }),
      catchError(error => {
        console.error(`[DeployStatusService] Error fetching deployment details for ${deploymentId}:`, error);
        // Return a well-formed error response that matches DeploymentStatusResponse
        return of({
          deploymentId,
          status: 'POLL_ERROR_SERVICE', // A specific status for service-level poll errors
          url: null,
          message: `Failed to fetch status: ${error.message || 'Unknown server error'}`
        } as DeploymentStatusResponse);
      })
    );
  }

  private mapBackendStatusToEventType(status?: string): DeploymentEvent['type'] {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'SUCCESS':
      case 'DEPLOYED':
        return 'SUCCEEDED';
      case 'FAILED':
      case 'ERROR': // Assuming ERROR from backend is a final failed state
      case 'POLL_ERROR_SERVICE': // Treat service poll error as a failure for event type
      case 'TIMEOUT_POLL': // Treat timeout as a failure for event type
        return 'FAILED';
      case 'CLONING': return 'CLONING';
      case 'BUILDING': return 'BUILDING';
      case 'UPLOADING': return 'UPLOADING';
      // Add other specific statuses from your backend if needed
      default:
        return 'STATUS_UPDATE'; // For any other non-terminal status
    }
  }

  /**
   * Polls the deployment status.
   * @param deploymentId The UUID of the deployment.
   * @param pollIntervalMs Interval between polls.
   * @param timeoutMs Maximum time to poll.
   */
  pollStatus(deploymentId: string, pollIntervalMs = 3000, timeoutMs = 300000): Observable<DeploymentStatusResponse> {
    const startTime = Date.now();

    return timer(0, pollIntervalMs).pipe(
      switchMap(() => this.getDeploymentDetailsInternal(deploymentId)), // Use the method that fetches full DTO
      tap(statusResponse => {
        console.log(`[DeployStatusService] Broadcasting status for ${deploymentId}:`, statusResponse);
        this.deploymentStatusSubject.next(statusResponse); // Broadcast status

        // Emit event for the event bus
        this.eventBus.emit({
          deploymentId: deploymentId,
          type: this.mapBackendStatusToEventType(statusResponse.status),
          message: `Deployment ${deploymentId} status: ${statusResponse.status}. ${statusResponse.message || ''}`,
          timestamp: new Date(),
          details: { url: statusResponse.url }
        });
      }),
      takeWhile(response => {
        const normalizedStatus = response.status ? response.status.toLowerCase() : '';
        // Define terminal states. Polling stops if status is one of these.
        const isTerminal =
          normalizedStatus === 'success' || // Assuming 'success' is a possible terminal state
          normalizedStatus === 'deployed' ||
          normalizedStatus === 'failed' ||
          normalizedStatus === 'poll_error_service'; // Stop on our service error too

        const isTimedOut = (Date.now() - startTime) > timeoutMs;

        if (isTimedOut && !isTerminal) {
          console.warn(`[DeployStatusService] Polling for deployment ${deploymentId} timed out after ${timeoutMs / 1000}s. Last status: ${normalizedStatus}`);
          // The map operator below will handle returning a timeout-specific status if needed.
        }
        // Continue polling if NOT terminal AND NOT timed out.
        return !isTerminal && !isTimedOut;
      }, true), // 'true' includes the value that caused takeWhile to stop (the first terminal state or last before timeout)
      map(response => { // This map is to potentially modify the last emitted response if timeout occurred
        const normalizedStatus = response.status ? response.status.toLowerCase() : '';
        const isTerminal = normalizedStatus === 'success' || normalizedStatus === 'deployed' || normalizedStatus === 'failed' || normalizedStatus === 'poll_error_service';
        if ((Date.now() - startTime) > timeoutMs && !isTerminal) {
          console.log(`[DeployStatusService] Polling for ${deploymentId} ended due to timeout. Overriding status to TIMEOUT_POLL.`);
          const timeoutResponse = {
            ...response,
            status: 'TIMEOUT_POLL', // Custom status for timeout
            message: response.message || `Polling timed out after ${timeoutMs / 1000} seconds.`
          } as DeploymentStatusResponse;
          // Emit a specific event for timeout if it's considered a distinct failure type
          this.eventBus.emit({
            deploymentId: deploymentId,
            type: 'FAILED', // Or a specific 'TIMEOUT_FAILED' if you add it to DeploymentEvent['type']
            message: `Polling for deployment ${deploymentId} timed out. Last known status: ${response.status}.`,
            timestamp: new Date(),
            details: { originalResponse: response }
          });
          return timeoutResponse;
        }
        return response; // Otherwise, return the response as is (e.g., the actual "deployed" or "failed" status)
      }),
      tap({
        complete: () => console.log(`[DeployStatusService] Polling stream COMPLETED for ${deploymentId}. No more emissions from this pollStatus call.`),
        error: err => console.error(`[DeployStatusService] Polling stream ERRORED for ${deploymentId}`, err) // Should ideally be caught by catchError below
      }),
      catchError(err => { // This catchError is for the entire polling pipeline (timer, switchMap, etc.)
        console.error(`[DeployStatusService] Critical error in polling pipeline for ${deploymentId}:`, err);
        this.eventBus.emit({
          deploymentId: deploymentId,
          type: 'POLL_ERROR', // A generic error for the polling mechanism itself
          message: `Critical error during status polling for ${deploymentId}.`,
          timestamp: new Date(),
          details: err
        });
        // Return a user-facing error structure or rethrow
        return of({ deploymentId, status: 'POLL_ERROR', message: err.message || 'Polling pipeline failed critically' } as DeploymentStatusResponse);
      })
    );
  }
}