package com.example.zeroops.dto; // Adjust to your base package

import com.example.zeroops.entity.DeploymentStatus; // Ensure this path is correct

import java.time.LocalDateTime;

public class DeploymentDTO {
    private Long id; // Database ID
    private String deploymentId; // Added this for consistency if needed by frontend for actions
    private String appName;
    private String branch; // Renamed from 'version' to match plan, maps to Deployment.version
    private String status; // e.g., "success", "building", "failed"

    private LocalDateTime deploymentDate; // Or startedAt
    private Integer durationSeconds;
    private String deploymentUrl;

    public DeploymentDTO(Long id, String deploymentId, String appName, String branch, String status,
            LocalDateTime deploymentDate, Integer durationSeconds, String deploymentUrl) {
        this.id = id;
        this.deploymentId = deploymentId;
        this.appName = appName;
        this.branch = branch;
        this.status = status;

        this.deploymentDate = deploymentDate;
        this.durationSeconds = durationSeconds;
        this.deploymentUrl = deploymentUrl;
        
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDeploymentId() {
        return deploymentId;
    }

    public void setDeploymentId(String deploymentId) {
        this.deploymentId = deploymentId;
    }

    public String getAppName() {
        return appName;
    }

    public void setAppName(String appName) {
        this.appName = appName;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getDeploymentDate() {
        return deploymentDate;
    }

    public void setDeploymentDate(LocalDateTime deploymentDate) {
        this.deploymentDate = deploymentDate;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getDeploymentUrl() {
        return deploymentUrl;
    }

    public void setDeploymentUrl(String deploymentUrl) {
        this.deploymentUrl = deploymentUrl;
    }

    
}