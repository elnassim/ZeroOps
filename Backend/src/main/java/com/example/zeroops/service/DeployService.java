package com.example.zeroops.service;

import com.example.zeroops.dto.DeployRequest;
import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.Application;
import com.example.zeroops.entity.Deployment;
import com.example.zeroops.entity.DeploymentStatus;
import com.example.zeroops.exception.ResourceNotFoundException;
import com.example.zeroops.model.User; // Assuming this is your security/domain User model
import com.example.zeroops.repository.ApplicationRepository;
import com.example.zeroops.repository.DeploymentRepository;
import com.example.zeroops.repository.UserRepository;
import com.example.zeroops.strategy.DeploymentStrategy;
import com.example.zeroops.strategy.DeploymentStrategyFactory;
import com.example.zeroops.util.FileUtils;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
            // Consider throwing a startup exception here if this directory is critical
        }
    }

    @Transactional // Ensure database operations are atomic
    public DeployResponse startDeploy(String repoUrl, String branch, String appName, String strategyType) throws Exception {
        String deploymentId = UUID.randomUUID().toString();
        logger.info("Starting deployment process for ID: {}, Repo: {}, Branch: {}, AppName: {}, Strategy: {}",
                deploymentId, repoUrl, branch, appName, strategyType);

        // 1. Create and save initial deployment record
        Deployment deployment = new Deployment();
        deployment.setDeploymentId(deploymentId);
        deployment.setGitRepoUrl(repoUrl);
        deployment.setGitBranch(branch != null ? branch : "main"); // Default branch if null
        deployment.setAppName(appName != null ? appName : deriveAppName(repoUrl));
        deployment.setStatus(DeploymentStatus.QUEUED); // Initial status
        deployment.setDeploymentDate(LocalDateTime.now());
        // deployment.setDeployedUrl(null); // Initially null
        // deployment.setDurationSeconds(0L); // Initially 0
        // Note: This simplified Deployment creation does not link to User or Application entities directly here.
        // If that's needed for this flow, User retrieval and Application linking logic would be added.

        try {
            deploymentRepository.save(deployment);
            logger.info("Deployment record saved for ID: {}", deploymentId);
        } catch (Exception e) {
            logger.error("Error saving deployment record for ID: {}: {}", deploymentId, e.getMessage(), e);
            throw new RuntimeException("Failed to save initial deployment record", e);
        }

        // 2. Prepare DeployRequest DTO for the strategy
        DeployRequest deployRequest = new DeployRequest();
        deployRequest.setDeploymentId(deploymentId);
        deployRequest.setRepoUrl(repoUrl);
        deployRequest.setBranch(deployment.getGitBranch());
        deployRequest.setAppName(deployment.getAppName());

        // 3. Get and execute the chosen strategy
        DeploymentStrategy strategy = DeploymentStrategyFactory.getStrategy(strategyType);
        String strategyMessage;
        try {
            // Pass RedisQueueService to the strategy's execute method
            strategyMessage = strategy.execute(deployRequest, redisQueueService);
            logger.info("Strategy execution message for {}: {}", deploymentId, strategyMessage);
        } catch (Exception e) {
            logger.error("Error executing deployment strategy for ID: {}: {}", deploymentId, e.getMessage(), e);
            // Update status to FAILED if strategy execution fails before queuing
            deployment.setStatus(DeploymentStatus.FAILED);
            deployment.setErrorMessage("Strategy execution failed: " + e.getMessage());
            deploymentRepository.save(deployment);
            throw e; // Re-throw to be caught by controller
        }

        // The actual cloning, S3 upload, and queuing to Redis is now handled within the strategy's execute method
        // (assuming strategies call redisQueueService.enqueueDeploymentTask).
        // If common pre-strategy steps like cloning were needed, they would be here.

        return new DeployResponse(deploymentId, "Deployment process initiated with " + strategyType + " strategy. " + strategyMessage);
    }

    // deriveAppName method as provided in the new snippet
    private String deriveAppName(String repoUrl) {
        if (repoUrl == null || repoUrl.isEmpty()) {
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
            logger.warn("Could not derive app name from repo URL: {}", repoUrl, e);
            return "default-app";
        }
    }

    @Transactional
    public DeployResponse redeploy(String existingDeploymentId, String strategyType) throws Exception {
        logger.info("--- Starting redeployment process for deployment UUID: {} with strategy: {} ---", existingDeploymentId, strategyType);

        Deployment existingDeployment = deploymentRepository.findByDeploymentId(existingDeploymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found with UUID: " + existingDeploymentId));

        // Create a new deployment ID for the redeployment attempt
        String newDeploymentId = UUID.randomUUID().toString();
        logger.info("New deployment ID for redeploy: {}", newDeploymentId);

        // Create a new Deployment entity for this redeployment, copying relevant details
        Deployment redeploymentRecord = new Deployment();
        redeploymentRecord.setDeploymentId(newDeploymentId);
        redeploymentRecord.setGitRepoUrl(existingDeployment.getGitRepoUrl());
        redeploymentRecord.setGitBranch(existingDeployment.getGitBranch());
        redeploymentRecord.setAppName(existingDeployment.getAppName());
        redeploymentRecord.setUser(existingDeployment.getUser()); // Copy user
        redeploymentRecord.setApplication(existingDeployment.getApplication()); // Copy application link
        redeploymentRecord.setVersion(existingDeployment.getVersion()); // Copy version

        redeploymentRecord.setStatus(DeploymentStatus.QUEUED);
        redeploymentRecord.setDeploymentDate(LocalDateTime.now());
        redeploymentRecord.setDurationSeconds(null);
        redeploymentRecord.setDeploymentUrl(null);
        redeploymentRecord.setErrorMessage(null);

        try {
            deploymentRepository.save(redeploymentRecord);
            logger.info("Redeployment record saved for new ID: {}", newDeploymentId);
        } catch (Exception e) {
            logger.error("Error saving redeployment record for new ID: {}: {}", newDeploymentId, e.getMessage(), e);
            throw new RuntimeException("Failed to save redeployment record", e);
        }

        DeployRequest deployRequest = new DeployRequest();
        deployRequest.setDeploymentId(newDeploymentId);
        deployRequest.setRepoUrl(redeploymentRecord.getGitRepoUrl());
        deployRequest.setBranch(redeploymentRecord.getGitBranch());
        deployRequest.setAppName(redeploymentRecord.getAppName());

        DeploymentStrategy strategy = DeploymentStrategyFactory.getStrategy(strategyType);
        String strategyMessage;
        try {
            strategyMessage = strategy.execute(deployRequest, redisQueueService);
            logger.info("Strategy execution message for redeployment {}: {}", newDeploymentId, strategyMessage);
        } catch (Exception e) {
            logger.error("Error executing deployment strategy for redeployment ID: {}: {}", newDeploymentId, e.getMessage(), e);
            redeploymentRecord.setStatus(DeploymentStatus.FAILED);
            redeploymentRecord.setErrorMessage("Strategy execution failed: " + e.getMessage());
            deploymentRepository.save(redeploymentRecord);
            throw e;
        }

        return new DeployResponse(newDeploymentId, "Redeployment process initiated with " + strategyType + " strategy. " + strategyMessage);
    }


    // --- Other existing methods from the original DeployService ---

    private void performGitClone(Path cloneDirectoryPath, String repoUrl, String branch)
            throws GitAPIException, IOException {
        if (Files.exists(cloneDirectoryPath)) {
            logger.warn("Clone directory {} already exists. Cleaning up before cloning.", cloneDirectoryPath);
            cleanupCloneDirectory(cloneDirectoryPath); // Pass the directory to clean, not its parent
        }
        // Ensure parent of cloneDirectoryPath exists, then clone into cloneDirectoryPath
        Files.createDirectories(cloneDirectoryPath.getParent());


        logger.info("Cloning repository: {} (branch: {}) into {}", repoUrl, branch, cloneDirectoryPath);
        Git.cloneRepository()
                .setURI(repoUrl)
                .setBranch(branch) // Use the specific branch
                .setDirectory(cloneDirectoryPath.toFile())
                .call();
        logger.info("Repository cloned successfully to {}", cloneDirectoryPath);
    }

    private void performS3Upload(String deploymentId, Path cloneDirectoryPath, Deployment deploymentRecord) {
        File repoFolderRoot = cloneDirectoryPath.toFile();
        if (!repoFolderRoot.exists() || !repoFolderRoot.isDirectory()) {
            logger.warn("Cloned repository folder not found or is not a directory: {} for deployment ID: {}",
                    cloneDirectoryPath, deploymentId);
            updateDeploymentStatus(deploymentRecord, DeploymentStatus.FAILED, "Cloned repository folder not found.");
            throw new RuntimeException("Cloned repository folder not found for deployment ID: " + deploymentId);
        }

        List<File> allFiles = FileUtils.getAllFiles(repoFolderRoot);
        logger.info("--- Starting S3 upload for {} files for deployment ID: {} ---", allFiles.size(), deploymentId);

        for (File file : allFiles) {
            String relativePath = repoFolderRoot.toPath().relativize(file.toPath()).toString().replace("\\", "/");
            String s3Key = deploymentId + "/" + relativePath;
            logger.debug("Uploading file: {} to S3 with key: {}", file.getAbsolutePath(), s3Key);
            storageService.uploadFile(s3Key, file);
        }
        logger.info("--- Finished S3 upload for deployment ID: {} ---", deploymentId);
        String deployedS3Url = "s3://" + s3BucketName + "/" + deploymentId + "/"; // More standard S3 URI
        updateDeploymentStatus(deploymentRecord, DeploymentStatus.UPLOAD_COMPLETE, deployedS3Url);
    }

    // This method is complex and links to User and Application.
    // It's kept if redeployApplication or other flows still use it.
    // The new startDeploy method uses a simpler inline Deployment creation.
    private Deployment createInitialDeploymentRecord(String deploymentId, String repoUrl, String branch) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            logger.error("User not authenticated. Cannot create deployment record for UUID: {}", deploymentId);
            throw new RuntimeException("User not authenticated. Cannot initiate deployment.");
        }
        String userEmail = authentication.getName();
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> {
                    logger.error("Authenticated user {} not found in database.", userEmail);
                    return new ResourceNotFoundException("Authenticated user not found in database: " + userEmail);
                });

        String appNameFromUrl = getRepoNameFromUrl(repoUrl);

        Application app = applicationRepository.findByUserAndRepositoryUrl(currentUser, repoUrl)
                .orElseGet(() -> {
                    Application newApp = new Application();
                    newApp.setName(appNameFromUrl);
                    newApp.setRepositoryUrl(repoUrl);
                    newApp.setUser(currentUser);
                    logger.info("Creating new application record for user: {}, repo: {}", currentUser.getEmail(),
                            repoUrl);
                    return applicationRepository.save(newApp);
                });

        Deployment newDeployment = new Deployment();
        newDeployment.setDeploymentId(deploymentId);
        newDeployment.setAppName(appNameFromUrl);
        newDeployment.setUser(currentUser);
        newDeployment.setApplication(app);
        newDeployment.setGitRepoUrl(repoUrl);
        newDeployment.setGitBranch(branch);
        newDeployment.setVersion(branch); // Assuming version is branch name

        newDeployment.setStatus(DeploymentStatus.IN_PROGRESS); // Or PENDING/QUEUED
        newDeployment.setDeploymentDate(LocalDateTime.now());
        try {
            Deployment savedDeployment = deploymentRepository.save(newDeployment);
            logger.info("Initial deployment record created with DB ID: {} for UUID: {} linked to App ID: {}",
                    savedDeployment.getId(), deploymentId, app.getId());
            return savedDeployment;
        } catch (Exception e) {
            logger.error("Failed to save initial deployment record for UUID: {}. Error: {}", deploymentId,
                    e.getMessage(), e);
            throw new RuntimeException(
                    "Database error creating deployment record. Check constraints.", e);
        }
    }

    private void updateDeploymentStatus(Deployment deploymentRecord, DeploymentStatus status,
            String deploymentUrlOrError) {
        if (deploymentRecord == null) {
            logger.warn("Attempted to update status for a null deployment record.");
            return;
        }
        // Fetch the latest state from DB to avoid stale updates if deploymentRecord is not managed
        Deployment freshDeployment = deploymentRepository.findById(deploymentRecord.getId())
                .orElse(deploymentRecord); 

        freshDeployment.setStatus(status);
        if (status == DeploymentStatus.FAILED) {
            freshDeployment.setErrorMessage(deploymentUrlOrError);
            freshDeployment.setDeploymentUrl(null);
        } else if (status == DeploymentStatus.UPLOAD_COMPLETE || status == DeploymentStatus.DEPLOYED || status == DeploymentStatus.SUCCESS ) { // SUCCESS is often used as final good state
            if (deploymentUrlOrError != null) {
                freshDeployment.setDeploymentUrl(deploymentUrlOrError);
            }
            freshDeployment.setErrorMessage(null);
        }
        deploymentRepository.save(freshDeployment);
        logger.info("Deployment status updated to {} for UUID: {}", status, freshDeployment.getDeploymentId());
    }

    private void cleanupCloneDirectory(Path cloneDirectoryPath) {
        // Cleans the specific clone directory, not its parent, unless that's intended.
        // The original code cleaned cloneDirectoryPath.getParent().
        // If cloneDirectoryPath is /tmp/zeroops_clones/deploymentId/repoName,
        // then getParent() is /tmp/zeroops_clones/deploymentId.
        // Let's assume we want to delete the /tmp/zeroops_clones/deploymentId directory.
        if (cloneDirectoryPath != null && Files.exists(cloneDirectoryPath.getParent())) {
            try {
                org.apache.commons.io.FileUtils.deleteDirectory(cloneDirectoryPath.getParent().toFile());
                logger.info("Cleaned up clone base directory: {}", cloneDirectoryPath.getParent());
            } catch (IOException e) {
                logger.error("Failed to cleanup clone base directory {}: {}", cloneDirectoryPath.getParent(), e.getMessage(), e);
            }
        } else if (cloneDirectoryPath != null) {
             logger.warn("Clone directory parent {} does not exist for cleanup.", cloneDirectoryPath.getParent());
        }
    }

    // This was in the original file, used by the old startDeploy.
    // The new startDeploy uses UUID.randomUUID().toString() directly. Kept for other methods.
    private String generateUniqueId() {
        return UUID.randomUUID().toString();
    }

    // This was in the original file, used by createInitialDeploymentRecord and redeployApplication.
    // The new startDeploy uses deriveAppName. Kept for other methods.
    private String getRepoNameFromUrl(String repoUrl) {
        if (repoUrl == null || repoUrl.isEmpty()) {
            return "unknown-repo";
        }
        String name = repoUrl.substring(repoUrl.lastIndexOf('/') + 1);
        if (name.endsWith(".git")) {
            name = name.substring(0, name.length() - 4);
        }
        return name.isEmpty() ? "unknown-repo" : name;
    }
}