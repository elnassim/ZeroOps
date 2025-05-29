package com.example.zeroops.service;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.DeploymentStatus; // Ensure this is the correct import
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired; // Add if not present
import org.springframework.stereotype.Service;

@Service
public class DeploymentFacade {

    private static final Logger logger = LoggerFactory.getLogger(DeploymentFacade.class);

    private final IDeployService deployService; // Changed from DeployService to IDeployService
    private final NotificationManager notifier;
    // private final RedisQueueService queueService; // No longer needed for getStatus here
    // Keep DeploymentService if you still need it for other details like URL, or remove if not.
    private final DeploymentService otherDeploymentServiceOperations; // Renamed for clarity if it's the other service


    @Autowired // Ensure constructor injection is used
    public DeploymentFacade(IDeployService deployService, // Changed to IDeployService
                            // RedisQueueService queueService, // Can be removed if only used for getStatus
                            NotificationManager notifier,
                            DeploymentService otherDeploymentServiceOperations) { // This is com.example.zeroops.service.DeploymentService
        this.deployService = deployService;
        // this.queueService = queueService;
        this.notifier = notifier;
        this.otherDeploymentServiceOperations = otherDeploymentServiceOperations;
    }

    public DeployResponse deployAndNotify(DeployRequest req) {
        logger.info("Facade: deployAndNotify called for repo: {}", req.getRepoUrl());
        DeployResponse initialResponse;
        try {
            logger.info("Facade: Calling deployService.startDeploy (via IDeployService)...");
            initialResponse = deployService.startDeploy(req.getRepoUrl(), req.getBranch(), req.getAppName());
            logger.info("Facade: deployService.startDeploy returned. Deployment ID: {}", initialResponse != null ? initialResponse.getDeploymentId() : "null initialResponse");
        } catch (Exception e) {
            logger.error("Facade: Exception during deployService.startDeploy for repo {}: {}", req.getRepoUrl(), e.getMessage(), e);
            notifier.notifyFailure("UNKNOWN_ID", req.getRepoUrl(), req.getBranch(), "Failed to initiate deployment: " + e.getMessage());
            return new DeployResponse(null, "Failed to initiate deployment: " + e.getMessage(), null);
        }

        if (initialResponse == null) {
            logger.error("Facade: initialResponse is null after startDeploy call for repo {}", req.getRepoUrl());
            notifier.notifyFailure("UNKNOWN_ID", req.getRepoUrl(), req.getBranch(), "Deployment process started but failed to return a valid initial response object.");
            return new DeployResponse(null, "Deployment process started but failed to return a valid initial response object.", null);
        }

        String deploymentId = initialResponse.getDeploymentId();
        logger.info("Facade: Extracted deploymentId: {}", deploymentId);


        if (deploymentId == null) {
             logger.error("Facade: Deployment ID is null in initialResponse for repo {}", req.getRepoUrl());
             notifier.notifyFailure("NULL_ID", req.getRepoUrl(), req.getBranch(), "Deployment process started but failed to return a valid ID in response.");
             return new DeployResponse(null, "Deployment process started but failed to return a valid ID in response.", null);
        }

        logger.info("Facade: Calling deployService.getStatus (via IDeployService) for ID: {}", deploymentId);
        DeploymentStatus status = deployService.getStatus(deploymentId); // Use the new getStatus method
        logger.info("Facade: deployService.getStatus returned: {} for ID: {}", status, deploymentId);

        String finalDeploymentUrl = initialResponse.getDeploymentUrl();
        logger.info("Facade: Initial finalDeploymentUrl: {}", finalDeploymentUrl);

        if (status == DeploymentStatus.SUCCESS || status == DeploymentStatus.DEPLOYED) {
            // Optionally try to get an updated URL if needed, for now, use initialResponse's URL
            // try {
            // com.example.zeroops.dto.DeploymentDTO deploymentDetails = otherDeploymentServiceOperations.getDeploymentDetailsById(deploymentId);
            // if (deploymentDetails != null && deploymentDetails.getDeploymentUrl() != null) {
            // finalDeploymentUrl = deploymentDetails.getDeploymentUrl();
            // }
            // } catch (Exception e) {
            // logger.warn("Facade: Could not fetch updated deployment details for URL for deployment ID {}: {}", deploymentId, e.getMessage());
            // }
            logger.info("Facade: Notifying success for ID: {}", deploymentId);
            notifier.notifySuccess(deploymentId, req.getRepoUrl(), req.getBranch(), finalDeploymentUrl);
        } else if (status == DeploymentStatus.FAILED) {
            String genericErrorMessage = "Deployment failed with status: " + status.name();
            logger.info("Facade: Notifying failure for deployment ID {} with generic message: {}", deploymentId, genericErrorMessage);
            notifier.notifyFailure(deploymentId, req.getRepoUrl(), req.getBranch(), genericErrorMessage);
        } else {
             logger.info("Facade: No specific notification for status {} for ID: {}", status, deploymentId);
        }
        
        DeployResponse finalResponseValue = new DeployResponse(deploymentId, "Deployment status: " + status.name(), finalDeploymentUrl);
        logger.info("Facade: Returning final response for ID {}: {}", deploymentId, finalResponseValue);
        return finalResponseValue;
    }
}