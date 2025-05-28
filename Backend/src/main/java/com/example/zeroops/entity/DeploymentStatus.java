package com.example.zeroops.entity;

public enum DeploymentStatus {
    PENDING,    // Initial state, waiting for processing
    QUEUED,    
    IN_PROGRESS,    // General status indicating active work, can be used as an initial state by DeployService
    CLONING_COMPLETE, // Git clone finished
    BUILDING,   
    UPLOADING,    // If you have a separate build step (e.g., compiling code, creating artifacts)
    UPLOAD_COMPLETE,// Artifacts uploaded to S3 (or other storage)
    SUCCESS,        // Successfully deployed and accessible
    FAILED,
    DEPLOYED,         // Deployment failed at some stage
    CANCELLED,
    UNKNOWN       // Deployment was cancelled
}