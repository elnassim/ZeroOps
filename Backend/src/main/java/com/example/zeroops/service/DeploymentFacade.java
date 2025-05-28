package com.example.zeroops.service;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.DeploymentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DeploymentFacade {

    private static final Logger logger = LoggerFactory.getLogger(DeploymentFacade.class);

    private final DeployService deployService;
    private final NotificationManager notifier;
    private final RedisQueueService queueService;
    // Keep DeploymentService if you still need it for other details like URL, or remove if not.
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
            initialResponse = deployService.startDeploy(req.getRepoUrl(), req.getBranch(), req.getAppName());
        } catch (Exception e) {
            logger.error("Facade: Failed to start deployment for repo {}: {}", req.getRepoUrl(), e.getMessage(), e);
            notifier.notifyFailure("UNKNOWN_ID", req.getRepoUrl(), req.getBranch(), "Failed to initiate deployment: " + e.getMessage());
            return new DeployResponse(null, "Failed to initiate deployment: " + e.getMessage(), null);
        }

        String deploymentId = initialResponse.getDeploymentId();
        if (deploymentId == null) {
             logger.error("Facade: Deployment ID is null after startDeploy for repo {}", req.getRepoUrl());
             notifier.notifyFailure("NULL_ID", req.getRepoUrl(), req.getBranch(), "Deployment process started but failed to return a valid ID.");
             return new DeployResponse(null, "Deployment process started but failed to return a valid ID.", null);
        }

        String statusString = queueService.getDeploymentStatusFromRedis(deploymentId);
        DeploymentStatus status = DeploymentStatus.UNKNOWN;
        String finalDeploymentUrl = initialResponse.getDeploymentUrl();

        if (statusString != null) {
            try {
                status = DeploymentStatus.valueOf(statusString.toUpperCase());
            } catch (IllegalArgumentException e) {
                logger.warn("Facade: Unknown status string '{}' from Redis for deployment ID {}. Defaulting to UNKNOWN.", statusString, deploymentId);
            }
        } else {
            logger.warn("Facade: No status found in Redis for deployment ID {}. Assuming PENDING or initial state.", deploymentId);
            status = DeploymentStatus.PENDING;
        }

        if (status == DeploymentStatus.SUCCESS || status == DeploymentStatus.DEPLOYED) {
            // Optionally try to get an updated URL if needed, for now, use initialResponse's URL
            // try {
            // com.example.zeroops.dto.DeploymentDTO deploymentDetails = deploymentService.getDeploymentDetailsById(deploymentId);
            // if (deploymentDetails != null && deploymentDetails.getDeploymentUrl() != null) {
            // finalDeploymentUrl = deploymentDetails.getDeploymentUrl();
            // }
            // } catch (Exception e) {
            // logger.warn("Facade: Could not fetch updated deployment details for URL for deployment ID {}: {}", deploymentId, e.getMessage());
            // }
            notifier.notifySuccess(deploymentId, req.getRepoUrl(), req.getBranch(), finalDeploymentUrl);
        } else if (status == DeploymentStatus.FAILED) {
            // MODIFIED: Use a generic error message instead of fetching from DTO
            String genericErrorMessage = "Deployment failed with status: " + status.name();
            logger.info("Facade: Notifying failure for deployment ID {} with generic message: {}", deploymentId, genericErrorMessage);
            notifier.notifyFailure(deploymentId, req.getRepoUrl(), req.getBranch(), genericErrorMessage);
        }

        return new DeployResponse(deploymentId, "Deployment status: " + status.name(), finalDeploymentUrl);
    }
}