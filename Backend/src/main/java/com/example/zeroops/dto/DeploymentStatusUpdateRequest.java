package com.example.zeroops.dto;

import com.example.zeroops.entity.DeploymentStatus; // Your enum

// Lombok annotations can simplify this
public class DeploymentStatusUpdateRequest {
    private DeploymentStatus status;
    private String deploymentUrl;
    private String errorMessage;
    private Long durationSeconds;

    // Getters and Setters
    public DeploymentStatus getStatus() { return status; }
    public void setStatus(DeploymentStatus status) { this.status = status; }

    public String getDeploymentUrl() { return deploymentUrl; }
    public void setDeploymentUrl(String deploymentUrl) { this.deploymentUrl = deploymentUrl; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Long getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Long durationSeconds) { this.durationSeconds = durationSeconds; }
}