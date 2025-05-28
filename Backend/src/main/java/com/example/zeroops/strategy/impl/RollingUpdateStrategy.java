// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\strategy\impl\RollingUpdateStrategy.java
package com.example.zeroops.strategy.impl;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.strategy.DeploymentStrategy;
import com.example.zeroops.service.RedisQueueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RollingUpdateStrategy implements DeploymentStrategy {

    private static final Logger logger = LoggerFactory.getLogger(RollingUpdateStrategy.class);

    @Override
    public String execute(DeployRequest request, RedisQueueService queueService) throws Exception {
        logger.info("Executing RollingUpdateStrategy for deployment ID: {}", request.getDeploymentId());
        // For demonstration, we'll just log and enqueue like default but could add different params
        // e.g., queueService.enqueueDeploymentTask(request.getDeploymentId(), request.getRepoUrl(), request.getBranch(), request.getAppName(), "rolling-params");
        queueService.enqueueDeploymentTask(request.getDeploymentId(), request.getRepoUrl(), request.getBranch(), request.getAppName());
        logger.info("Deployment task enqueued for {} using Rolling Update Strategy.", request.getDeploymentId());
        return "Rolling Update deployment process initiated for " + request.getDeploymentId() + ". Task enqueued.";
    }
}