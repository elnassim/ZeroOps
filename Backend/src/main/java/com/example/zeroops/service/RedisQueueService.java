package com.example.zeroops.service;

import com.example.zeroops.dto.DeployRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisQueueService {

    private static final Logger logger = LoggerFactory.getLogger(RedisQueueService.class);
    private final StringRedisTemplate redisTemplate;

    public static final String DEPLOY_QUEUE_NAME = "deploy-queue"; // Make public if DeployService needs it directly
    private static final String STATUS_HASH_KEY = "deployment-statuses";

    @Autowired
    public RedisQueueService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Enqueues a deployment ID for processing.
     * @param deploymentId The ID of the deployment to enqueue.
     */
    public void enqueueDeploymentTask(String deploymentId) {
        try {
            redisTemplate.opsForList().leftPush(DEPLOY_QUEUE_NAME, deploymentId);
            logger.info("Enqueued deployment ID {} to Redis queue '{}'", deploymentId, DEPLOY_QUEUE_NAME);
        } catch (Exception e) {
            logger.error("Failed to enqueue deployment ID {} to Redis queue '{}': {}", deploymentId, DEPLOY_QUEUE_NAME, e.getMessage(), e);
            // Optionally, rethrow or handle as a critical failure
        }
    }

    public String getDeploymentStatusFromRedis(String deploymentId) {
        try {
            Object status = redisTemplate.opsForHash().get(STATUS_HASH_KEY, deploymentId);
            logger.debug("Fetched Redis status for deployment ID {}: {}", deploymentId, status);
            return status != null ? status.toString() : null;
        } catch (Exception e) {
            logger.error("Failed to get status for deployment ID {} from Redis: {}", deploymentId, e.getMessage(), e);
            return null;
        }
    }

    public void updateDeploymentStatusInRedis(String deploymentId, String newStatus) {
        try {
            redisTemplate.opsForHash().put(STATUS_HASH_KEY, deploymentId, newStatus);
            logger.info("Updated Redis status for deployment ID {} to {} in hash '{}'", deploymentId, newStatus, STATUS_HASH_KEY);
        } catch (Exception e) {
            logger.error("Failed to update status for deployment ID {} to {} in Redis: {}", deploymentId, newStatus, e.getMessage(), e);
        }
    }
}