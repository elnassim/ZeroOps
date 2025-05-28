// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\strategy\DeploymentStrategy.java
package com.example.zeroops.strategy;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.service.RedisQueueService; // If strategies interact with queue

public interface DeploymentStrategy {
    /**
     * Executes the deployment according to this specific strategy.
     *
     * @param request The deployment request details.
     * @param queueService An instance of RedisQueueService to enqueue tasks.
     * @return A message indicating the outcome or status of initiating the strategy.
     * @throws Exception if any error occurs during strategy execution.
     */
    String execute(DeployRequest request, RedisQueueService queueService) throws Exception;
}