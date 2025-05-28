package com.example.zeroops.controller;

import com.example.zeroops.dto.DeploymentDTO;
import com.example.zeroops.entity.DeploymentStatus; // Ensure this is your enum
import com.example.zeroops.service.DeploymentService;
import com.example.zeroops.service.DeployService; // Keep for redeploy
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*; // Import all from web.bind.annotation

import java.util.Map;
import java.util.List;
import com.example.zeroops.dto.DeploymentStatusUpdateRequest; // Added this DTO import


@RestController
@RequestMapping("/api/deployments") // Allow all origins for simplicity in dev, configure properly for prod
public class DeploymentController {

    private static final Logger logger = LoggerFactory.getLogger(DeploymentController.class);
    private final DeploymentService deploymentService;
    private final DeployService deployService; // Used for redeploy functionality

    @Autowired
    public DeploymentController(DeploymentService deploymentService, DeployService deployService) {
        this.deploymentService = deploymentService;
        this.deployService = deployService;
    }

    // New Endpoint: Initiate a new deployment
    @PostMapping
    public ResponseEntity<DeploymentDTO> createDeployment(@RequestBody GitRepoRequest request) {
        logger.info("Received request to create deployment for Git URL: {}", request.getGitUrl());
        if (request.getGitUrl() == null || request.getGitUrl().trim().isEmpty()) {
            logger.warn("Git URL is missing in create deployment request.");
            return ResponseEntity.badRequest().build(); // Basic validation
        }
        // appName and branch are optional, DeploymentService will handle defaults if null/empty
        DeploymentDTO newDeployment = deploymentService.initiateNewDeployment(
                request.getGitUrl(),
                request.getAppName(),
                request.getBranch()
        );
        logger.info("Deployment initiated successfully with UUID: {}", newDeployment.getDeploymentId());
        return ResponseEntity.ok(newDeployment);
    }

    // New Endpoint: Get details of a specific deployment by UUID
    @GetMapping("/{deploymentId}")
    public ResponseEntity<DeploymentDTO> getDeploymentByUuid(@PathVariable String deploymentId) {
        logger.info("Received request to get deployment details for UUID: {}", deploymentId);
        DeploymentDTO deploymentDetails = deploymentService.getDeploymentDetailsById(deploymentId);
        // DeploymentService throws ResourceNotFoundException which results in 404 if not found
        return ResponseEntity.ok(deploymentDetails);
    }

    // Existing Endpoint: Get paginated list of deployments for the current user
    @GetMapping
    public ResponseEntity<Page<DeploymentDTO>> getMyDeployments(
            @RequestParam(required = false) List<DeploymentStatus> status, // e.g., status=DEPLOYED,FAILED
            @RequestParam(required = false) List<String> branch,       // e.g., branch=main,develop
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "deploymentDate,desc") String[] sort) { // e.g. sort=appName,asc

        logger.info("Received request for getMyDeployments - Page: {}, Size: {}, Statuses: {}, Branches: {}, Sort: {}",
                page, size, status, branch, String.join(";", sort));

        Sort.Direction direction = Sort.Direction.DESC;
        String property = "deploymentDate";

        if (sort.length == 2) {
            try {
                direction = Sort.Direction.fromString(sort[1]);
                property = sort[0];
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid sort direction provided: {}. Defaulting to DESC.", sort[1]);
                // Keep default direction and property
            }
        } else if (sort.length == 1 && !sort[0].isEmpty()){
            property = sort[0]; // Default to DESC if only property is given
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, property));
        
        Page<DeploymentDTO> deploymentsPage = deploymentService.getDeploymentsForCurrentUser(status, branch, pageable);
        logger.info("Returning {} deployments for current user.", deploymentsPage.getNumberOfElements());
        return ResponseEntity.ok(deploymentsPage);
    }

    // Existing Endpoint: Redeploy an application
    @PostMapping("/{deploymentId}/redeploy")
    public ResponseEntity<Map<String, String>> redeploy(@PathVariable String deploymentId) {
        logger.info("Received request to redeploy deployment UUID: {}", deploymentId);
        // Assuming deployService.redeployApplication handles the logic and returns a new ID or status
        String newDeploymentIdOrStatus = deployService.redeployApplication(deploymentId);
        logger.info("Redeployment initiated for UUID: {}, New ID/Status: {}", deploymentId, newDeploymentIdOrStatus);
        return ResponseEntity.ok(Map.of("message", "Redeployment initiated.", "newDeploymentId", newDeploymentIdOrStatus));
    }

    // Endpoint for deploy-service to update status
    @PutMapping("/{deploymentId}/status")
    public ResponseEntity<Void> updateDeploymentStatus(
            @PathVariable String deploymentId,
            @RequestBody DeploymentStatusUpdateRequest statusUpdateRequest) {
        logger.info("Received status update for UUID {}: Status={}, URL={}, Error={}",
                deploymentId, statusUpdateRequest.getStatus(), statusUpdateRequest.getDeploymentUrl(), statusUpdateRequest.getErrorMessage());
        deploymentService.updateDeploymentStatus(
                deploymentId,
                statusUpdateRequest.getStatus(),
                statusUpdateRequest.getDeploymentUrl(),
                statusUpdateRequest.getErrorMessage(),
                statusUpdateRequest.getDurationSeconds()
        );
        return ResponseEntity.ok().build();
    }

    // Static inner class for the POST request body when creating a new deployment
    public static class GitRepoRequest {
        private String gitUrl;
        private String appName; // Optional
        private String branch;  // Optional

        // Getters and Setters
        public String getGitUrl() { return gitUrl; }
        public void setGitUrl(String gitUrl) { this.gitUrl = gitUrl; }

        public String getAppName() { return appName; }
        public void setAppName(String appName) { this.appName = appName; }

        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
    }
}