package com.example.zeroops.service;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.Application;
import com.example.zeroops.entity.Deployment;
import com.example.zeroops.entity.DeploymentStatus;
import com.example.zeroops.exception.ResourceNotFoundException;
import com.example.zeroops.model.User;
import com.example.zeroops.repository.ApplicationRepository;
import com.example.zeroops.repository.DeploymentRepository;
import com.example.zeroops.repository.UserRepository;
// Removed: import com.example.zeroops.strategy.DeploymentStrategy;
// Removed: import com.example.zeroops.strategy.DeploymentStrategyFactory;
import com.example.zeroops.util.FileUtils;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DeployService {

    private static final Logger logger = LoggerFactory.getLogger(DeployService.class);
    private static final String BASE_CLONE_PATH = System.getProperty("java.io.tmpdir") + File.separator
            + "zeroops_clones";

    private final StorageService storageService;
    private final DeploymentRepository deploymentRepository;
    private final UserRepository userRepository;
    private final RedisQueueService redisQueueService;
    private final ApplicationRepository applicationRepository;

    private final String awsRegion;
    private final String s3BucketName;

    @Autowired
    public DeployService(StorageService storageService,
            DeploymentRepository deploymentRepository,
            UserRepository userRepository,
            RedisQueueService redisQueueService,
            ApplicationRepository applicationRepository,
            @Value("${aws.region}") String awsRegion,
            @Value("${aws.s3.bucketName}") String s3BucketName) {
        this.storageService = storageService;
        this.deploymentRepository = deploymentRepository;
        this.userRepository = userRepository;
        this.redisQueueService = redisQueueService;
        this.applicationRepository = applicationRepository;
        this.awsRegion = awsRegion;
        this.s3BucketName = s3BucketName;

        try {
            Files.createDirectories(Paths.get(BASE_CLONE_PATH));
            logger.info("Base clone directory ensured at: {}", BASE_CLONE_PATH);
        } catch (IOException e) {
            logger.error("Could not create base clone directory: {}", BASE_CLONE_PATH, e);
        }
    }

    @Transactional
    public DeployResponse startDeploy(String repoUrl, String branch, String appNameInput) throws Exception {
        String deploymentId = UUID.randomUUID().toString();
        logger.info("Starting deployment process for ID: {}, Repo: {}, Branch: {}, AppName: {}",
                deploymentId, repoUrl, branch, appNameInput);

        Path cloneDirectoryPath = null;
        Deployment savedDeployment = null;

        try {
            Deployment deployment = new Deployment();
            deployment.setDeploymentId(deploymentId);
            deployment.setGitRepoUrl(repoUrl);
            deployment.setGitBranch(branch != null && !branch.isEmpty() ? branch : "main");
            String actualAppName = appNameInput != null && !appNameInput.isEmpty() ? appNameInput : deriveAppName(repoUrl);
            deployment.setAppName(actualAppName);
            deployment.setVersion(deployment.getGitBranch());
            deployment.setStatus(DeploymentStatus.PENDING);
            deployment.setDeploymentDate(LocalDateTime.now());

            savedDeployment = deploymentRepository.save(deployment);
            logger.info("Initial deployment record saved for ID: {}", deploymentId);

            cloneDirectoryPath = Files.createTempDirectory("clone-" + deploymentId);
            logger.info("Created temporary directory for clone: {}", cloneDirectoryPath.toString());
            performGitClone(cloneDirectoryPath, savedDeployment.getGitRepoUrl(), savedDeployment.getGitBranch());

            performS3Upload(deploymentId, cloneDirectoryPath, savedDeployment);

            // Enqueue the deployment task directly
            redisQueueService.enqueueDeploymentTask(deploymentId);
            logger.info("Deployment task enqueued for ID: {}", deploymentId);
            updateDeploymentStatus(savedDeployment, DeploymentStatus.QUEUED, "Task enqueued for processing.");

            return new DeployResponse(deploymentId, "Deployment process initiated and enqueued.", savedDeployment.getDeploymentUrl());

        } catch (Exception e) {
            logger.error("Error during deployment initiation for ID {}: {}", deploymentId, e.getMessage(), e);
            if (savedDeployment != null) {
                updateDeploymentStatus(savedDeployment, DeploymentStatus.FAILED, "Deployment initiation error: " + e.getMessage());
            }
            throw new RuntimeException("Failed to initiate deployment: " + e.getMessage(), e);
        } finally {
            if (cloneDirectoryPath != null && Files.exists(cloneDirectoryPath)) {
                 try {
                    org.apache.commons.io.FileUtils.deleteDirectory(cloneDirectoryPath.toFile());
                    logger.info("Cleaned up clone directory: {}", cloneDirectoryPath);
                } catch (IOException ioException) {
                    logger.error("Failed to cleanup clone directory {}: {}", cloneDirectoryPath, ioException.getMessage(), ioException);
                }
            }
            logger.info("--- Finished deployment process for ID: {} ---", deploymentId);
        }
    }

    private String deriveAppName(String repoUrl) {
        if (repoUrl == null || repoUrl.trim().isEmpty()) {
            return "default-app";
        }
        try {
            String path = new java.net.URL(repoUrl).getPath();
            String appName = path.substring(path.lastIndexOf('/') + 1);
            if (appName.endsWith(".git")) {
                appName = appName.substring(0, appName.length() - 4);
            }
            return appName.isEmpty() ? "default-app" : appName;
        } catch (Exception e) {
            logger.warn("Could not derive app name from repo URL: {}. Using default.", repoUrl, e);
            return "default-app";
        }
    }

    @Transactional
    public DeployResponse redeploy(String existingDeploymentId) throws Exception {
        logger.info("--- Starting redeployment process for existing Deployment ID: {} ---", existingDeploymentId);

        Deployment existingDeployment = deploymentRepository.findByDeploymentId(existingDeploymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found with ID: " + existingDeploymentId));

        String newDeploymentId = UUID.randomUUID().toString();
        logger.info("New Deployment ID for redeploy: {}", newDeploymentId);
        
        Path cloneDirectoryPath = null;
        Deployment savedRedeploymentRecord = null;

        try {
            Deployment redeploymentRecord = new Deployment();
            redeploymentRecord.setDeploymentId(newDeploymentId);
            redeploymentRecord.setGitRepoUrl(existingDeployment.getGitRepoUrl());
            redeploymentRecord.setGitBranch(existingDeployment.getGitBranch());
            redeploymentRecord.setAppName(existingDeployment.getAppName());
            redeploymentRecord.setVersion(existingDeployment.getVersion());

            if (existingDeployment.getUser() != null) {
                redeploymentRecord.setUser(existingDeployment.getUser());
            }
            if (existingDeployment.getApplication() != null) {
                redeploymentRecord.setApplication(existingDeployment.getApplication());
            }

            redeploymentRecord.setStatus(DeploymentStatus.PENDING);
            redeploymentRecord.setDeploymentDate(LocalDateTime.now());

            savedRedeploymentRecord = deploymentRepository.save(redeploymentRecord);
            logger.info("Redeployment record saved for new ID: {}", newDeploymentId);

            cloneDirectoryPath = Files.createTempDirectory("clone-" + newDeploymentId);
            performGitClone(cloneDirectoryPath, savedRedeploymentRecord.getGitRepoUrl(), savedRedeploymentRecord.getGitBranch());
            performS3Upload(newDeploymentId, cloneDirectoryPath, savedRedeploymentRecord);

            // Enqueue the redeployment task directly
            redisQueueService.enqueueDeploymentTask(newDeploymentId);
            logger.info("Redeployment task enqueued for new ID: {}", newDeploymentId);
            updateDeploymentStatus(savedRedeploymentRecord, DeploymentStatus.QUEUED, "Redeployment task enqueued.");

            return new DeployResponse(newDeploymentId, "Redeployment process initiated and enqueued.", savedRedeploymentRecord.getDeploymentUrl());
        } catch (Exception e) {
            logger.error("Error during redeployment for ID {}: {}", newDeploymentId, e.getMessage(), e);
             if (savedRedeploymentRecord != null) {
                updateDeploymentStatus(savedRedeploymentRecord, DeploymentStatus.FAILED, "Redeployment initiation error: " + e.getMessage());
            }
            throw new RuntimeException("Failed to initiate redeployment: " + e.getMessage(), e);
        } finally {
            if (cloneDirectoryPath != null && Files.exists(cloneDirectoryPath)) {
                 try {
                    org.apache.commons.io.FileUtils.deleteDirectory(cloneDirectoryPath.toFile());
                    logger.info("Cleaned up clone directory for redeploy: {}", cloneDirectoryPath);
                } catch (IOException ioException) {
                    logger.error("Failed to cleanup clone directory for redeploy {}: {}", cloneDirectoryPath, ioException.getMessage(), ioException);
                }
            }
            logger.info("--- Finished redeployment process for ID: {} ---", newDeploymentId);
        }
    }

    private void performGitClone(Path cloneDirectoryPath, String repoUrl, String branch)
            throws GitAPIException, IOException {
        logger.info("Cloning repository: {} (branch: {}) into {}", repoUrl, branch, cloneDirectoryPath.toString());
        Git.cloneRepository()
                .setURI(repoUrl)
                .setBranch(branch)
                .setDirectory(cloneDirectoryPath.toFile())
                .call();
        logger.info("Repository cloned successfully to {}", cloneDirectoryPath);
    }

    private void performS3Upload(String deploymentId, Path artifactPath, Deployment deploymentRecord) {
        File repoFolderRoot = artifactPath.toFile();
        if (!repoFolderRoot.exists() || !repoFolderRoot.isDirectory()) {
            logger.warn("Artifact path not found or is not a directory: {} for deployment ID: {}",
                    artifactPath, deploymentId);
            updateDeploymentStatus(deploymentRecord, DeploymentStatus.FAILED, "Artifact path not found for S3 upload.");
            throw new RuntimeException("Artifact path not found for S3 upload, deployment ID: " + deploymentId);
        }

        List<File> allFiles = FileUtils.getAllFiles(repoFolderRoot);
        logger.info("--- Starting S3 upload for {} files for deployment ID: {} ---", allFiles.size(), deploymentId);

        for (File file : allFiles) {
            String relativePath = repoFolderRoot.toPath().relativize(file.toPath()).toString().replace("\\", "/");
            String s3Key = deploymentId + "/" + relativePath;
            storageService.uploadFile(s3Key, file);
        }
        logger.info("--- Finished S3 upload for deployment ID: {} ---", deploymentId);
        String deployedS3Url = String.format("https://%s.s3.%s.amazonaws.com/%s/", s3BucketName, awsRegion, deploymentId);
        updateDeploymentStatus(deploymentRecord, DeploymentStatus.UPLOAD_COMPLETE, deployedS3Url);
    }

    private void updateDeploymentStatus(Deployment deploymentRecord, DeploymentStatus status, String messageOrUrl) {
        if (deploymentRecord == null || deploymentRecord.getId() == null) {
            logger.warn("Attempted to update status for a null or unsaved deployment record.");
            return;
        }
        Deployment freshDeployment = deploymentRepository.findById(deploymentRecord.getId())
                .orElseGet(() -> {
                    logger.warn("Deployment record with ID {} not found for status update. Using passed record.", deploymentRecord.getId());
                    return deploymentRecord;
                });

        freshDeployment.setStatus(status);
        if (status == DeploymentStatus.FAILED) {
            freshDeployment.setErrorMessage(messageOrUrl);
            freshDeployment.setDeploymentUrl(null);
        } else if (status == DeploymentStatus.UPLOAD_COMPLETE || status == DeploymentStatus.DEPLOYED || status == DeploymentStatus.SUCCESS) {
            if (messageOrUrl != null && (status == DeploymentStatus.UPLOAD_COMPLETE || status == DeploymentStatus.DEPLOYED || status == DeploymentStatus.SUCCESS)) {
                freshDeployment.setDeploymentUrl(messageOrUrl);
            }
            freshDeployment.setErrorMessage(null);
        } else if (status == DeploymentStatus.QUEUED) {
             if (messageOrUrl != null) {
                logger.info("Deployment {} queued with message: {}", freshDeployment.getDeploymentId(), messageOrUrl);
             }
        }

        if (status == DeploymentStatus.SUCCESS || status == DeploymentStatus.FAILED || status == DeploymentStatus.DEPLOYED) {
            freshDeployment.setEndedAt(LocalDateTime.now());
            if (freshDeployment.getDeploymentDate() != null && freshDeployment.getEndedAt() != null) {
                freshDeployment.setDurationSeconds(java.time.Duration.between(freshDeployment.getDeploymentDate(), freshDeployment.getEndedAt()).getSeconds());
            }
        }
        deploymentRepository.save(freshDeployment);
        logger.info("Deployment status updated to {} for ID: {}", status, freshDeployment.getDeploymentId());
    }
}