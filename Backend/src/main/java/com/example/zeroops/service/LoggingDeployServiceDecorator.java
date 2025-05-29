package com.example.zeroops.service;

import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.DeploymentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary // Make this the default IDeployService for injection
public class LoggingDeployServiceDecorator implements IDeployService {
    private static final Logger log = LoggerFactory.getLogger(LoggingDeployServiceDecorator.class);

    private final IDeployService coreService;

    public LoggingDeployServiceDecorator(@Qualifier("coreDeployService") IDeployService coreService) {
        this.coreService = coreService;
    }

    @Override
    public DeployResponse startDeploy(String repoUrl, String branch, String appNameInput) throws Exception {
        log.info(">>> Decorator: startDeploy called with repoUrl='{}', branch='{}', appNameInput='{}'", repoUrl, branch, appNameInput);
        DeployResponse response = null;
        try {
            response = coreService.startDeploy(repoUrl, branch, appNameInput);
            log.info("<<< Decorator: startDeploy returned deploymentId='{}', message='{}'", response != null ? response.getDeploymentId() : "null", response != null ? response.getMessage() : "null");
            return response;
        } catch (Exception e) {
            log.error("<<< Decorator: startDeploy failed for repoUrl='{}': {}", repoUrl, e.getMessage(), e);
            throw e; // Re-throw the exception to be handled by the caller (e.g., Facade)
        }
    }

    @Override
    public DeploymentStatus getStatus(String deploymentId) {
        log.info(">>> Decorator: getStatus called for deploymentId='{}'", deploymentId);
        DeploymentStatus status = coreService.getStatus(deploymentId);
        log.info("<<< Decorator: getStatus returned status='{}' for deploymentId='{}'", status, deploymentId);
        return status;
    }
}