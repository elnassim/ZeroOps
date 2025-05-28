// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\strategy\impl\DefaultDeployStrategy.java
package com.example.zeroops.strategy.impl;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.strategy.DeploymentStrategy;
import com.example.zeroops.service.RedisQueueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component; // If it needs to be a bean

// @Component // Uncomment if this strategy needs DI, e.g. for RedisQueueService if not passed
public class DefaultDeployStrategy implements DeploymentStrategy {

    private static final Logger logger = LoggerFactory.getLogger(DefaultDeployStrategy.class);

    @Override
    public String execute(DeployRequest request, RedisQueueService queueService) throws Exception {
        logger.info("Executing DefaultDeployStrategy for deployment ID: {}", request.getDeploymentId());
        // This is where your current logic to enqueue to Redis would go.
        // For demonstration, we assume queueService.enqueueDeploymentTask is the relevant method.
        queueService.enqueueDeploymentTask(request.getDeploymentId(), request.getRepoUrl(), request.getBranch(), request.getAppName());
        logger.info("Deployment task enqueued for {} using Default Strategy.", request.getDeploymentId());
        return "Default deployment process initiated for " + request.getDeploymentId() + ". Task enqueued.";
    }
}