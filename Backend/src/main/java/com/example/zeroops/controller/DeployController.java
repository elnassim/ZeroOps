package com.example.zeroops.controller;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.service.DeployService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid; // Or jakarta.validation.Valid depending on Spring Boot version
import java.util.Map;

@RestController
@RequestMapping("/api") // Base path changed as per your new structure
public class DeployController {

    private static final Logger logger = LoggerFactory.getLogger(DeployController.class);

    @Autowired // Autowired as per your new structure
    private DeployService deployService;

    // Constructor injection is generally preferred, but @Autowired on field is also common
    // public DeployController(DeployService deployService) {
    //     this.deployService = deployService;
    // }

    @PostMapping("/deploy")
    public ResponseEntity<?> deploy(
            @Valid @RequestBody DeployRequest deployRequest,
            @RequestParam(defaultValue = "default") String strategyType) {
        try {
            logger.info("Received deployment request: URL={}, Branch={}, AppName={}, Strategy={}",
                    deployRequest.getRepoUrl(), deployRequest.getBranch(), deployRequest.getAppName(), strategyType);

            if (deployRequest.getRepoUrl() == null || deployRequest.getRepoUrl().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Repository URL is required."));
            }
            // Branch validation can be added here if it's strictly required and not handled by service defaults
            // if (deployRequest.getBranch() == null || deployRequest.getBranch().trim().isEmpty()) {
            //     return ResponseEntity.badRequest().body(Map.of("error", "Branch is required."));
            // }

            DeployResponse response = deployService.startDeploy(
                    deployRequest.getRepoUrl(),
                    deployRequest.getBranch(),
                    deployRequest.getAppName(),
                    strategyType
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for deployment: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error during deployment initiation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to initiate deployment: " + e.getMessage()));
        }
    }

    // Placeholder for GET /api/deployments/{deploymentId}
    // This endpoint seems to be in your DeploymentController.java.
    // If you intend to move it here, the implementation would be similar to what's in DeploymentController.
    /*
    @GetMapping("/deployments/{deploymentId}")
    public ResponseEntity<?> getDeploymentStatus(@PathVariable String deploymentId) {
        // Implementation to get deployment status, potentially from DeployService or DeploymentService
        logger.info("Placeholder: Get status for deployment ID {}", deploymentId);
        // Example: return ResponseEntity.ok(deployService.getDeploymentStatus(deploymentId));
        return ResponseEntity.ok(Map.of("message", "Status for " + deploymentId + " (to be implemented)"));
    }
    */

    // Placeholder for GET /api/deployments
    // This endpoint also seems to be in your DeploymentController.java.
    /*
    @GetMapping("/deployments")
    public ResponseEntity<?> getAllDeployments(
            // @RequestParam for pagination, filtering, sorting
            ) {
        // Implementation to get all deployments
        logger.info("Placeholder: Get all deployments");
        // Example: return ResponseEntity.ok(deployService.getAllDeployments(pageable));
        return ResponseEntity.ok(Map.of("message", "All deployments (to be implemented)"));
    }
    */

    @PostMapping("/deployments/{deploymentId}/redeploy")
    public ResponseEntity<?> redeploy(@PathVariable String deploymentId,
                                    @RequestParam(defaultValue = "default") String strategyType) {
        try {
            logger.info("Received redeploy request for ID: {}, Strategy: {}", deploymentId, strategyType);
            DeployResponse response = deployService.redeploy(deploymentId, strategyType);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error during redeployment for ID {}: {}", deploymentId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to redeploy: " + e.getMessage()));
        }
    }
}