
export interface Deployment {
  id?: number; // Assuming this comes from backend DTO
  deploymentId: string;
  appName: string;
  branch: string;
  status: string;
  deploymentDate?: string | Date;
  errorMessage?: string;
  dbId?: string; // LocalDateTime from Java maps to string or Date
  durationSeconds?: number;
  deploymentUrl?: string | null; // This will hold the live URL
  // Add any other fields you expect from DeploymentDTO
  gitUrl?: string;
  iconBg?: string;
  startedAt?: string;
  duration?: number;
  url?: string | null; // If you want to store the original gitUrl on the frontend model too
}
export type FrontendDeploymentStatus = "processing" | "deployed" | "failed" | "pending" | "queued" | "cloning" | "building" | "uploading" | "error" | "poll_error_service";
export interface BackendDeploymentDTO { // DTO for listing deployments
  id: string;
  repoUrl: string; // Or gitUrl
  branch: string;
  status: string;
  appName?: string;
  createdAt: string;
  updatedAt: string;
  deploymentUrl?: string; // Ensure this field is present
  userId?: string;
}
export interface LogEntry {
  timestamp: string; // Or Date
  message: string;
  level?: string; // e.g., INFO, ERROR
}