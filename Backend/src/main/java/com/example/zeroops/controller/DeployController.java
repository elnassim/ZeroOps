package com.example.zeroops.controller;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.service.DeploymentFacade; // Import the facade
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

    private final DeploymentFacade facade; // Use the facade
    // Remove direct DeployService if facade handles all its previous responsibilities in this controller

    @Autowired
    public DeployController(DeploymentFacade facade) { // Inject the facade
        this.facade = facade;
    }

    @PostMapping("/deploy")
    public ResponseEntity<?> deploy(@Valid @RequestBody DeployRequest deployRequest) {
        try {
            logger.info("DeployController: Received facade deployment request: URL={}, Branch={}, AppName={}",
                    deployRequest.getRepoUrl(), deployRequest.getBranch(), deployRequest.getAppName());

            if (deployRequest.getRepoUrl() == null || deployRequest.getRepoUrl().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Repository URL is required."));
            }

            DeployResponse response = facade.deployAndNotify(deployRequest); // Call the facade

            // Determine HTTP status based on facade's response (optional, could always be 200 OK)
            if (response.getDeploymentId() == null || (response.getMessage() !=null && response.getMessage().contains("Failed"))) {
                 // If facade indicates a failure to even start or get an ID
                if (response.getMessage() != null && response.getMessage().toLowerCase().contains("failed to initiate deployment")) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
                }
                // For other "failures" after getting an ID, it might still be a 200 OK with failure in message
            }
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) { // Should be caught by facade or service ideally
            logger.warn("Bad request for deployment (controller level): {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) { // General catch-all
            logger.error("Unexpected error during facade deployment (controller level): {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    // Your existing /redeploy/{existingDeploymentId} endpoint can remain here
    // or also be refactored to use the facade if a similar "redeployAndNotify" method is added to the facade.
    // For now, assuming it's separate as per your question.
    /*
    @PostMapping("/redeploy/{existingDeploymentId}")
    public ResponseEntity<?> redeploy(@PathVariable String existingDeploymentId) {
        // ... existing logic or refactor to use facade.redeployAndNotify(...)
    }
    */
}