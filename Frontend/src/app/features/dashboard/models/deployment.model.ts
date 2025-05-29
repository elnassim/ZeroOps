// Ensure FrontendDeploymentStatus includes all statuses from your backend, e.g., 'QUEUED', 'PENDING', etc.
// and those used in toUpperCase() in the service.
export type FrontendDeploymentStatus =
  | 'SUCCESS'
  | 'BUILDING'
  | 'FAILED'
  | 'QUEUED'
  | 'PENDING'
  | 'CLONING'
  | 'UPLOADING'
  | 'DEPLOYED' // Common alias for SUCCESS
  | 'ERROR'    // Common alias for FAILED
  | 'UNKNOWN'
  | 'UPLOAD_COMPLETE'
  | 'POLL_ERROR_SERVICE'; // Add any other statuses your app uses

export interface Deployment {
  id: string; // Primary identifier, maps from CoreBackendDeploymentDTO.id (UUID)
  deploymentId: string; // Also maps from CoreBackendDeploymentDTO.id (UUID), for consistency if used elsewhere
  appName: string; // Mapped from CoreBackendDeploymentDTO.appName, ensure default if optional
  iconBg: string; // Needs to be assigned, e.g., randomly or based on appName
  branch: string;
  status: FrontendDeploymentStatus;
  startedAt: string; // Mapped from CoreBackendDeploymentDTO.createdAt or a specific field
  duration: number; // in seconds, needs to be mapped or calculated
  url?: string; // This can be the primary display URL, maps from CoreBackendDeploymentDTO.deploymentUrl
  gitUrl?: string; // Maps from CoreBackendDeploymentDTO.repoUrl
  // Additional fields from CoreBackendDeploymentDTO
  repoUrl: string; // Mapped from CoreBackendDeploymentDTO.repoUrl
  createdAt: string;
  updatedAt: string;
  userId?: string;
  deploymentUrl?: string; // This is the specific nip.io URL
}