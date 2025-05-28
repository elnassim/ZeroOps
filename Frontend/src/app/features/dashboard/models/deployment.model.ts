export type FrontendDeploymentStatus = 'success' | 'building' | 'failed';

export interface Deployment {
  id: string;
  deploymentId: string;
  appName: string;
  iconBg: string;
  branch: string;
  status: FrontendDeploymentStatus;
  startedAt: string;
  duration: number; // in seconds
  url?: string;
   gitUrl?: string;
}
