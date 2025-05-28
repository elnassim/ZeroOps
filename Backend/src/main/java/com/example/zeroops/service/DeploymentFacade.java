package com.example.zeroops.service;

import com.example.zeroops.dto.DeployRequest; // Correct DTO import
import com.example.zeroops.dto.DeployResponse; // Correct DTO import
import com.example.zeroops.entity.DeploymentStatus; // Correct Enum import
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DeploymentFacade {

    private static final Logger logger = LoggerFactory.getLogger(DeploymentFacade.class);

    private final DeployService deployService;
    private final NotificationManager notifier;
    private final RedisQueueService queueService;
    // Assuming you might need DeploymentService for more detailed status or URL later
    private final DeploymentService deploymentService;


    public DeploymentFacade(DeployService deployService,
                            RedisQueueService queueService,
                            NotificationManager notifier,
                            DeploymentService deploymentService) {
        this.deployService = deployService;
        this.queueService = queueService;
        this.notifier = notifier;
        this.deploymentService = deploymentService;
    }

    /**
     * 1) Records & enqueues deployment
     * 2) Polls status once (or you can make it fire-and-forget)
     * 3) Sends notification
     */
    public DeployResponse deployAndNotify(DeployRequest req) {
        DeployResponse initialResponse;
        try {
            // 1) start deploy (DB record + enqueue)
            // This call matches DeployService.startDeploy(String repoUrl, String branch, String appNameInput)
            // and it returns DeployResponse
            initialResponse = deployService.startDeploy(req.getRepoUrl(), req.getBranch(), req.getAppName());
        } catch (Exception e) {
            logger.error("Facade: Failed to start deployment for repo {}: {}", req.getRepoUrl(), e.getMessage(), e);
            // Attempt to notify failure even if startDeploy fails catastrophically, if possible
            // For a robust system, you might need a placeholder ID or a different notification path
            notifier.notifyFailure("UNKNOWN_ID", req.getRepoUrl(), req.getBranch(), "Failed to initiate deployment: " + e.getMessage());
            return new DeployResponse(null, "Failed to initiate deployment: " + e.getMessage(), null);
        }

        String deploymentId = initialResponse.getDeploymentId();
        if (deploymentId == null) {
             logger.error("Facade: Deployment ID is null after startDeploy for repo {}", req.getRepoUrl());
             notifier.notifyFailure("NULL_ID", req.getRepoUrl(), req.getBranch(), "Deployment process started but failed to return a valid ID.");
             return new DeployResponse(null, "Deployment process started but failed to return a valid ID.", null);
        }

        // 2) (simplest) poll one status update from Redis
        // RedisQueueService.getDeploymentStatusFromRedis returns String
        String statusString = queueService.getDeploymentStatusFromRedis(deploymentId);
        DeploymentStatus status = DeploymentStatus.UNKNOWN; // Default status
        String finalDeploymentUrl = initialResponse.getDeploymentUrl(); // Use URL from initial response if available

        if (statusString != null) {
            try {
                status = DeploymentStatus.valueOf(statusString.toUpperCase());
            } catch (IllegalArgumentException e) {
                logger.warn("Facade: Unknown status string '{}' from Redis for deployment ID {}. Defaulting to UNKNOWN.", statusString, deploymentId);
            }
        } else {
            logger.warn("Facade: No status found in Redis for deployment ID {}. Assuming PENDING or initial state.", deploymentId);
            // If no status in Redis yet, it might still be PENDING or just enqueued.
            // For a simple single poll, this might mean it's not finished.
            // A more robust polling would loop or wait.
            status = DeploymentStatus.PENDING; // Or QUEUED, depending on what startDeploy sets before returning
        }

        // 3) notify user
        // For a more accurate deployment URL, you might need to fetch the full deployment details
        // if the status indicates completion and the initialResponse didn't have the final URL.
        // This is a simplification for the "poll once" scenario.
        // If status is SUCCESS/DEPLOYED, try to get a more definitive URL
        if (status == DeploymentStatus.SUCCESS || status == DeploymentStatus.DEPLOYED) {
            try {
                // This is an example, you might need to fetch the full Deployment entity
                // if the 'initialResponse.getDeploymentUrl()' isn't the final one.
                // For simplicity, we use what we have or what might be updated.
                // If your DeployService.startDeploy already returns the final URL on success, this might not be needed.
                // Or, if the deploy-service updates the DB, fetch it:
                // com.example.zeroops.dto.DeploymentDTO deploymentDetails = deploymentService.getDeploymentDetailsById(deploymentId);
                // if (deploymentDetails != null && deploymentDetails.getDeploymentUrl() != null) {
                //    finalDeploymentUrl = deploymentDetails.getDeploymentUrl();
                // }
            } catch (Exception e) {
                logger.warn("Facade: Could not fetch updated deployment details for URL for deployment ID {}: {}", deploymentId, e.getMessage());
            }
            notifier.notifySuccess(deploymentId, req.getRepoUrl(), req.getBranch(), finalDeploymentUrl);
        } else if (status == DeploymentStatus.FAILED) {
            // Fetch error message if possible
            String errorMessage = "Deployment failed with status " + status.name();
            try {
                 com.example.zeroops.dto.DeploymentDTO deploymentDetails = deploymentService.getDeploymentDetailsById(deploymentId);
                 if (deploymentDetails != null && deploymentDetails.getErrorMessage() != null) {
                    errorMessage = deploymentDetails.getErrorMessage();
                 }
            } catch (Exception e) {
                 logger.warn("Facade: Could not fetch error message for failed deployment ID {}: {}", deploymentId, e.getMessage());
            }
            notifier.notifyFailure(deploymentId, req.getRepoUrl(), req.getBranch(), errorMessage);
        }
        // For other statuses (PENDING, IN_PROGRESS, etc.), you might choose not to send a final notification
        // or send an "in-progress" notification if this facade is meant to be fire-and-forget.

        // 4) return a unified response
        // The DeployResponse DTO is (String deploymentId, String message, String deploymentUrl)
        return new DeployResponse(deploymentId, "Deployment status: " + status.name(), finalDeploymentUrl);
    }
}