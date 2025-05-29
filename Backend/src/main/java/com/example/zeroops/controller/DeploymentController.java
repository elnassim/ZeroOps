package com.example.zeroops.controller;

import com.example.zeroops.dto.DeploymentDTO;
import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse; // Import DeployResponse
import com.example.zeroops.entity.DeploymentStatus;
import com.example.zeroops.service.DeploymentService;
import com.example.zeroops.service.DeployService;
import org.slf4j.Logger;
import com.example.zeroops.service.DeploymentFacade;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import com.example.zeroops.dto.DeploymentStatusUpdateRequest;


@RestController
@RequestMapping("/api/deployments")
public class DeploymentController {

    private static final Logger logger = LoggerFactory.getLogger(DeploymentController.class);
    private final DeploymentService deploymentService; // For managing deployment records
    private final DeployService deployService;
    private final DeploymentFacade deploymentFacade;
     // For initiating deploy/redeploy actions

    @Autowired
    public DeploymentController(
            DeploymentService deploymentService,
            DeployService deployService, // Keep if still used for redeploy
            DeploymentFacade deploymentFacade) { // <<< ADD DeploymentFacade as a parameter
        this.deploymentService = deploymentService;
        this.deployService = deployService; // Keep if still used for redeploy
        this.deploymentFacade = deploymentFacade; // <<< ASSIGN the constructor parameter to the field
    }

    @PostMapping
    public ResponseEntity<?> createDeployment(@RequestBody GitRepoRequest request) {
        logger.info("Received request to create deployment for Git URL: {}", request.getGitUrl());
        if (request.getGitUrl() == null || request.getGitUrl().trim().isEmpty()) {
            logger.warn("Git URL is missing in create deployment request.");
            return ResponseEntity.badRequest().body(Map.of("error", "Git URL is required."));
        }
        try {
            // Create a DeployRequest DTO to pass to the facade
            DeployRequest deployRequest = new DeployRequest();
            deployRequest.setRepoUrl(request.getGitUrl());
            deployRequest.setAppName(request.getAppName());
            deployRequest.setBranch(request.getBranch());

            // Call the facade's method
            logger.info("Calling deploymentFacade.deployAndNotify for Git URL: {}", request.getGitUrl());
            DeployResponse response = deploymentFacade.deployAndNotify(deployRequest); // <<< USE THE FACADE

            // Handle the response from the facade
            if (response.getDeploymentId() == null && response.getMessage() != null && response.getMessage().contains("Failed")) {
                logger.error("Facade indicated failure to initiate deployment: {}", response.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                     .body(Map.of("error", response.getMessage()));
            }
            
            logger.info("Deployment initiated via facade successfully. Response: {}", response);
            // The facade's DeployResponse might be different from DeploymentDTO.
            // Return the DeployResponse directly, or map it to DeploymentDTO if your frontend expects that.
            // For simplicity, returning DeployResponse:
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error creating deployment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create deployment: " + e.getMessage()));
        }
    }


    @GetMapping("/{deploymentId}")
    public ResponseEntity<DeploymentDTO> getDeploymentByUuid(@PathVariable String deploymentId) {
        logger.info("Received request to get deployment details for UUID: {}", deploymentId);
        DeploymentDTO deploymentDetails = deploymentService.getDeploymentDetailsById(deploymentId);
        return ResponseEntity.ok(deploymentDetails);
    }

    @GetMapping
    public ResponseEntity<Page<DeploymentDTO>> getMyDeployments(
            @RequestParam(required = false) List<DeploymentStatus> status,
            @RequestParam(required = false) List<String> branch,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "deploymentDate,desc") String[] sort) {

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
            }
        } else if (sort.length == 1 && !sort[0].isEmpty()){
            property = sort[0];
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, property));
        
        Page<DeploymentDTO> deploymentsPage = deploymentService.getDeploymentsForCurrentUser(status, branch, pageable);
        logger.info("Returning {} deployments for current user.", deploymentsPage.getNumberOfElements());
        return ResponseEntity.ok(deploymentsPage);
    }

    @PostMapping("/{deploymentId}/redeploy")
    public ResponseEntity<?> redeploy(@PathVariable String deploymentId) { // Removed strategyType if it was here
        logger.info("Received request to redeploy deployment ID: {}", deploymentId);
        try {
            // This still uses the direct deployService. You might want to move this to the facade too for consistency.
            DeployResponse response = deployService.redeploy(deploymentId); 
            logger.info("Redeployment initiated for ID: {}, Message: {}", deploymentId, response.getMessage());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error during redeployment for ID {}: {}", deploymentId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to redeploy: " + e.getMessage()));
        }
    }

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

    public static class GitRepoRequest {
        private String gitUrl;
        private String appName;
        private String branch;

        public String getGitUrl() { return gitUrl; }
        public void setGitUrl(String gitUrl) { this.gitUrl = gitUrl; }
        public String getAppName() { return appName; }
        public void setAppName(String appName) { this.appName = appName; }
        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
    }
}