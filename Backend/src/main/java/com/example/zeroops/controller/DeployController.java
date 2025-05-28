package com.example.zeroops.controller;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.service.DeployService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api") // Base path for these direct deployment actions
public class DeployController {

    private static final Logger logger = LoggerFactory.getLogger(DeployController.class);

    @Autowired
    private DeployService deployService;

    @PostMapping("/deploy") // Changed from /api/deploy to /api/deployments/actions/deploy or similar if needed
    public ResponseEntity<?> deploy(
            @Valid @RequestBody DeployRequest deployRequest) { // Removed strategyType
        try {
            logger.info("Received deployment request: URL={}, Branch={}, AppName={}",
                    deployRequest.getRepoUrl(), deployRequest.getBranch(), deployRequest.getAppName());

            if (deployRequest.getRepoUrl() == null || deployRequest.getRepoUrl().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Repository URL is required."));
            }

            DeployResponse response = deployService.startDeploy(
                    deployRequest.getRepoUrl(),
                    deployRequest.getBranch(),
                    deployRequest.getAppName()
                    // Removed strategyType
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

    // This endpoint might be better suited under /api/deployments/{deploymentId}/redeploy
    // as it acts on an existing deployment.
    // The DeploymentController already has /api/deployments/{deploymentId}/redeploy
    // If this one is kept, ensure its path is distinct or it serves a different purpose.
    // For now, assuming it's a direct action similar to /deploy.
    @PostMapping("/redeploy/{existingDeploymentId}") // Changed path for clarity, or use the one in DeploymentController
    public ResponseEntity<?> redeploy(@PathVariable String existingDeploymentId) { // Removed strategyType
        try {
            logger.info("Received redeploy request for ID: {}", existingDeploymentId);
            DeployResponse response = deployService.redeploy(existingDeploymentId); // Removed strategyType
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error during redeployment for ID {}: {}", existingDeploymentId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to redeploy: " + e.getMessage()));
        }
    }
}