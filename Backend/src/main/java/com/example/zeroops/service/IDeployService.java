package com.example.zeroops.service;

import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.DeploymentStatus;

public interface IDeployService {
    DeployResponse startDeploy(String repoUrl, String branch, String appNameInput) throws Exception;
    DeploymentStatus getStatus(String deploymentId); // New method to encapsulate status retrieval
}