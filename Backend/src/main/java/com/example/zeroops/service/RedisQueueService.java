package com.example.zeroops.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisQueueService {

    private static final Logger logger = LoggerFactory.getLogger(RedisQueueService.class);
    private static final String DEPLOY_QUEUE_KEY = "deploy-queue";
    private static final String STATUS_HASH_KEY = "deployment-status"; // Using a more descriptive hash key

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public RedisQueueService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Enqueues a deployment ID for further processing and sets its initial status in Redis.
     * This is typically called after files have been successfully uploaded to S3.
     * @param deploymentId The UUID of the deployment.
     */
    public void enqueueDeploymentForProcessing(String deploymentId) {
        try {
            // Add the deployment ID to the processing queue
            redisTemplate.opsForList().leftPush(DEPLOY_QUEUE_KEY, deploymentId);
            logger.info("Enqueued deployment ID {} to Redis queue '{}'", deploymentId, DEPLOY_QUEUE_KEY);

            // Store the status in a Redis hash (e.g., for workers or quick status checks)
            // The status "UPLOADED" indicates files are in S3 and ready for the next step.
            redisTemplate.opsForHash().put(STATUS_HASH_KEY, deploymentId, "UPLOADED_TO_S3");
            logger.info("Set Redis status for deployment ID {} to UPLOADED_TO_S3 in hash '{}'", deploymentId, STATUS_HASH_KEY);
        } catch (Exception e) {
            logger.error("Failed to enqueue deployment ID {} or set status in Redis: {}", deploymentId, e.getMessage(), e);
            // Depending on your requirements, you might want to re-throw or handle this more gracefully
        }
    }

    /**
     * Retrieves the status of a deployment from Redis.
     * @param deploymentId The UUID of the deployment.
     * @return The status string or null if not found.
     */
    public String getDeploymentStatusFromRedis(String deploymentId) {
        try {
            Object status = redisTemplate.opsForHash().get(STATUS_HASH_KEY, deploymentId);
            return status != null ? status.toString() : null;
        } catch (Exception e) {
            logger.error("Failed to get status for deployment ID {} from Redis: {}", deploymentId, e.getMessage(), e);
            return null;
        }
    }

    // You could add more methods here, e.g., to update status in Redis by a worker
    public void updateDeploymentStatusInRedis(String deploymentId, String newStatus) {
        try {
            redisTemplate.opsForHash().put(STATUS_HASH_KEY, deploymentId, newStatus);
            logger.info("Updated Redis status for deployment ID {} to {} in hash '{}'", deploymentId, newStatus, STATUS_HASH_KEY);
        } catch (Exception e) {
            logger.error("Failed to update status for deployment ID {} to {} in Redis: {}", deploymentId, newStatus, e.getMessage(), e);
        }
    }
}