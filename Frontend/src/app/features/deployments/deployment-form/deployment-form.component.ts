// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Frontend\src\app\features\deployments\deployment-form\deployment-form.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf, *ngFor
import { Subscription } from 'rxjs';
import { Deployment } from '../../../core/models/deployment.model'; // Adjust path
import { DeploymentService } from '../../../core/services/deployment.service'; // Adjust path

@Component({
  selector: 'app-deployment-form',
  standalone: true, // Assuming standalone component structure
  imports: [CommonModule, FormsModule], // Add CommonModule and FormsModule
  templateUrl: './deployment-form.component.html',
  styleUrls: ['./deployment-form.component.scss'],
})
export class DeploymentFormComponent implements OnInit{
  // Form fields
  gitUrlInput: string = '';
  appNameInput: string = '';
  branchInput: string = 'main'; // Default branch

  deployments: Deployment[] = [];
  private pollingSubscriptions: { [key: string]: Subscription } = {};

  isLoading: boolean = false;
  errorMessage: string | null = null;

  constructor(private deploymentService: DeploymentService) {}

  ngOnInit(): void {
    // Optionally load existing deployments if you implement such an endpoint
  }

  onSubmitDeployment(form: NgForm): void {
    if (form.invalid || !this.gitUrlInput.trim()) {
      this.errorMessage = 'Git Repository URL is required.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;

    const appName = this.appNameInput.trim() || undefined; // Send undefined if empty
    const branch = this.branchInput.trim() || undefined; // Send undefined if empty

    this.deploymentService
      .initiateDeployment(this.gitUrlInput.trim(), appName, branch)
      .subscribe({
        next: (newDeployment) => {
          this.isLoading = false;
          // Add the submitted gitUrl to the deployment object for immediate display
          const displayDeployment: Deployment = {
            ...newDeployment,
            gitUrl: this.gitUrlInput.trim(), // Store the original gitUrl
            appName: newDeployment.appName || appName || 'Untitled Project', // Ensure appName is set
            branch: newDeployment.branch || branch || 'main', // Ensure branch is set
          };
          this.deployments.unshift(displayDeployment); // Add to the beginning of the list
          if (
            newDeployment.status === 'processing' ||
            newDeployment.status === 'pending' ||
            newDeployment.status === 'queued'
          ) {
            this.startPollingForStatus(newDeployment.deploymentId);
          }
          form.resetForm({
            // Reset form but keep defaults if any
            branchInput: 'main', // Keep default for branch
          });
          this.gitUrlInput = '';
          this.appNameInput = '';
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = `Error initiating deployment: ${
            err.error?.message || err.message || 'Unknown server error'
          }`;
          console.error('Deployment initiation error:', err);
        },
      });
  }

  startPollingForStatus(deploymentId: string): void {
    if (this.pollingSubscriptions[deploymentId]) {
      this.pollingSubscriptions[deploymentId].unsubscribe();
    }

    this.pollingSubscriptions[deploymentId] = this.deploymentService
      .pollDeploymentStatus(deploymentId)
      .subscribe({
        next: (updatedDeployment) => {
          const index = this.deployments.findIndex(
            (d) => d.deploymentId === deploymentId
          );
          if (index !== -1) {
            // Preserve the initially submitted gitUrl and appName if not part of every poll response
            const originalGitUrl = this.deployments[index].gitUrl;
            const originalAppName = this.deployments[index].appName;
            const originalBranch = this.deployments[index].branch;
            this.deployments[index] = {
              ...updatedDeployment,
              gitUrl: originalGitUrl || updatedDeployment.gitUrl,
              appName: updatedDeployment.appName || originalAppName,
              branch: updatedDeployment.branch || originalBranch,
            };
          }
          // If polling should stop (e.g., status is 'deployed' or 'failed'), unsubscribe
          if (updatedDeployment.status !== 'processing') {
            if (this.pollingSubscriptions[deploymentId]) {
              this.pollingSubscriptions[deploymentId].unsubscribe();
              delete this.pollingSubscriptions[deploymentId];
            }
          }
        },
        error: (err) => {
          console.error(`Error polling status for ${deploymentId}:`, err);
          const index = this.deployments.findIndex(
            (d) => d.deploymentId === deploymentId
          );
          if (index !== -1) {
            this.deployments[index].status = 'POLL_ERROR';
          }
          if (this.pollingSubscriptions[deploymentId]) {
            this.pollingSubscriptions[deploymentId].unsubscribe();
            delete this.pollingSubscriptions[deploymentId];
          }
        },
      });
  }

  ngOnDestroy(): void {
    Object.values(this.pollingSubscriptions).forEach((sub) =>
      sub.unsubscribe()
    );
  }
}
