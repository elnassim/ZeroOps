// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\strategy\impl\BlueGreenStrategy.java
package com.example.zeroops.strategy.impl;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.strategy.DeploymentStrategy;
import com.example.zeroops.service.RedisQueueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BlueGreenStrategy implements DeploymentStrategy {

    private static final Logger logger = LoggerFactory.getLogger(BlueGreenStrategy.class);

    @Override
    public String execute(DeployRequest request, RedisQueueService queueService) throws Exception {
        logger.info("Executing BlueGreenStrategy for deployment ID: {}", request.getDeploymentId());
        // For demonstration, log and enqueue.
        // e.g., queueService.enqueueDeploymentTask(request.getDeploymentId(), request.getRepoUrl(), request.getBranch(), request.getAppName(), "blue-green-params");
        queueService.enqueueDeploymentTask(request.getDeploymentId(), request.getRepoUrl(), request.getBranch(), request.getAppName());
        logger.info("Deployment task enqueued for {} using Blue-Green Strategy.", request.getDeploymentId());
        return "Blue-Green deployment process initiated for " + request.getDeploymentId() + ". Task enqueued.";
    }
}