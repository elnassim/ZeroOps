package com.example.zeroops.service;

import com.example.zeroops.dto.DeployResponse;
import com.example.zeroops.entity.Application; // Import Application
import com.example.zeroops.entity.Deployment;
import com.example.zeroops.entity.DeploymentStatus;
import com.example.zeroops.exception.ResourceNotFoundException;
import com.example.zeroops.model.User;
import com.example.zeroops.repository.ApplicationRepository;
import com.example.zeroops.repository.DeploymentRepository;
import com.example.zeroops.repository.UserRepository;
import com.example.zeroops.util.FileUtils;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication; // Import Spring Security classes
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
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
import java.net.URL;
import java.net.MalformedURLException; // Specific exception for URL parsing

@Service
@Qualifier("coreDeployService") // Qualify this specific implementation
public class DeployService implements IDeployService {

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
    private final String ec2PublicIp; // New field for EC2 public IP

    @Autowired
    public DeployService(StorageService storageService,
            DeploymentRepository deploymentRepository,
            UserRepository userRepository,
            RedisQueueService redisQueueService,
            ApplicationRepository applicationRepository,
            @Value("${aws.region}") String awsRegion,
            @Value("${aws.s3.bucketName}") String s3BucketName,
            @Value("${zeroops.deployment.ec2-public-ip}") String ec2PublicIp) { // Inject ec2PublicIp
        this.storageService = storageService;
        this.deploymentRepository = deploymentRepository;
        this.userRepository = userRepository;
        this.redisQueueService = redisQueueService;
        this.applicationRepository = applicationRepository;
        this.awsRegion = awsRegion;
        this.s3BucketName = s3BucketName;
        this.ec2PublicIp = ec2PublicIp; // Assign injected value

        try {
            Files.createDirectories(Paths.get(BASE_CLONE_PATH));
            logger.info("Base clone directory ensured at: {}", BASE_CLONE_PATH);
        } catch (IOException e) {
            logger.error("Could not create base clone directory: {}", BASE_CLONE_PATH, e);
            // Consider if this should prevent startup
        }
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            logger.warn("Deployment initiated by unauthenticated or anonymous user. This should not happen for create operations.");
            // Throw an exception as user context is critical for associating deployments.
            throw new UsernameNotFoundException("User not authenticated for deployment initiation.");
        }
        String username = authentication.getName(); // This is typically the email if using email as username
        // Assuming your UserRepository has findByEmail. If it's findByUsername, adjust accordingly.
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username/email: " + username));
    }

    @Override
    @Transactional
    public DeployResponse startDeploy(String repoUrl, String branch, String appNameInput) throws Exception {
        String deploymentId = UUID.randomUUID().toString();
        logger.info("Starting deployment process for ID: {}, Repo: {}, Branch: {}, AppName: {}",
                deploymentId, repoUrl, branch, appNameInput);

        Path cloneDirectoryPath = null;
        Deployment savedDeployment = null;
        String nipIoUrl = null;

        try {
            User currentUser = getCurrentAuthenticatedUser();
            String actualAppName = (appNameInput != null && !appNameInput.trim().isEmpty()) ? appNameInput.trim() : deriveAppName(repoUrl);

            Application application = new Application();
            application.setUser(currentUser);
            application.setName(actualAppName);
            String uniqueAppGitUrl = repoUrl + "#app_for_deploy_" + deploymentId.substring(0, 8);
            application.setGitUrl(uniqueAppGitUrl);
            application.setRepositoryUrl(uniqueAppGitUrl); 
            application.setCreatedAt(LocalDateTime.now());
            Application savedApplication = applicationRepository.save(application);
            logger.info("Saved Application with ID: {} for deployment {}", savedApplication.getId(), deploymentId);

            Deployment deployment = new Deployment();
            deployment.setDeploymentId(deploymentId);
            deployment.setGitRepoUrl(repoUrl);
            deployment.setGitBranch(branch != null && !branch.isEmpty() ? branch : "main");
            deployment.setAppName(actualAppName);
            deployment.setVersion(deployment.getGitBranch()); 
            deployment.setStatus(DeploymentStatus.PENDING);
            deployment.setDeploymentDate(LocalDateTime.now());
            deployment.setUser(currentUser); 
            deployment.setApplication(savedApplication); 

            // Construct and set the nip.io URL before the first save or immediately after if ID is DB generated
            // Since deploymentId is a UUID generated here, we can set it before the first save.
            if (ec2PublicIp != null && !ec2PublicIp.isEmpty() && !ec2PublicIp.equalsIgnoreCase("YOUR_EC2_ELASTIC_IP")  /* Add more specific checks if your placeholder is different */) {
                nipIoUrl = String.format("http://%s.%s.nip.io", deploymentId, ec2PublicIp);
                deployment.setDeploymentUrl(nipIoUrl);
                logger.info("Constructed nip.io URL: {}", nipIoUrl);
            } else {
                logger.warn("EC2 Public IP (zeroops.deployment.ec2-public-ip) is not configured correctly or is a placeholder. nip.io URL will not be set for deployment {}.", deploymentId);
            }
            
            savedDeployment = deploymentRepository.save(deployment);
            logger.info("Initial deployment record saved for ID: {} with URL: {}", deploymentId, savedDeployment.getDeploymentUrl());

            cloneDirectoryPath = Files.createTempDirectory("clone-" + deploymentId);
            logger.info("Created temporary directory for clone: {}", cloneDirectoryPath.toString());
            performGitClone(cloneDirectoryPath, savedDeployment.getGitRepoUrl(), savedDeployment.getGitBranch());

            performS3Upload(deploymentId, cloneDirectoryPath, savedDeployment);

            redisQueueService.enqueueDeploymentTask(deploymentId);
            logger.info("Deployment task enqueued for ID: {}", deploymentId);
            updateDeploymentStatus(savedDeployment, DeploymentStatus.QUEUED, "Task enqueued for processing.");

            // Ensure the response contains the correct deployment URL (nip.io URL if generated)
            return new DeployResponse(deploymentId, "Deployment process initiated and enqueued.", savedDeployment.getDeploymentUrl());

        } catch (Exception e) {
            logger.error("Error during deployment initiation for ID {}: {}", deploymentId, e.getMessage(), e);
            if (savedDeployment != null && savedDeployment.getId() != null) { 
                updateDeploymentStatus(savedDeployment, DeploymentStatus.FAILED, "Deployment initiation error: " + e.getMessage());
            } else if (deploymentId != null) {
                logger.error("Deployment record for {} was not saved or ID is null, cannot update status to FAILED.", deploymentId);
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

    @Override
    public DeploymentStatus getStatus(String deploymentId) {
        logger.debug("CoreDeployService: getStatus called for deploymentId={}", deploymentId);
        String statusString = redisQueueService.getDeploymentStatusFromRedis(deploymentId);
        if (statusString != null) {
            try {
                return DeploymentStatus.valueOf(statusString.toUpperCase());
            } catch (IllegalArgumentException e) {
                logger.warn("CoreDeployService: Unknown status string '{}' from Redis for deployment ID {}. Defaulting to UNKNOWN.", statusString, deploymentId);
                return DeploymentStatus.UNKNOWN;
            }
        } else {
            logger.warn("CoreDeployService: No status found in Redis for deployment ID {}. Checking DB.", deploymentId);
            Deployment deployment = deploymentRepository.findByDeploymentId(deploymentId).orElse(null);
            if (deployment != null) {
                logger.info("CoreDeployService: Status for {} found in DB: {}", deploymentId, deployment.getStatus());
                return deployment.getStatus();
            }
            logger.warn("CoreDeployService: No status found in DB for deployment ID {}. Assuming PENDING.", deploymentId);
            return DeploymentStatus.PENDING;
        }
    }

    @Transactional
    public DeployResponse redeploy(String existingDeploymentId) throws Exception {
        logger.info("--- Starting redeployment process for existing Deployment ID: {} ---", existingDeploymentId);

        Deployment existingDeployment = deploymentRepository.findByDeploymentId(existingDeploymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found with ID: " + existingDeploymentId));

        User currentUser = existingDeployment.getUser(); 
        if (currentUser == null) {
            logger.warn("User not found on existing deployment {}, attempting to get current authenticated user.", existingDeploymentId);
            currentUser = getCurrentAuthenticatedUser(); 
        }
        
        Application currentApplication = existingDeployment.getApplication(); 
         if (currentApplication == null) {
            logger.error("Application not found on existing deployment {}. This is unexpected. Redeployment cannot proceed without an application.", existingDeploymentId);
            throw new IllegalStateException("Cannot redeploy: Existing deployment " + existingDeploymentId + " does not have an associated application.");
        }

        String newDeploymentId = UUID.randomUUID().toString();
        logger.info("New Deployment ID for redeploy: {}", newDeploymentId);
        
        Path cloneDirectoryPath = null;
        Deployment savedRedeploymentRecord = null;
        String nipIoUrl = null;

        try {
            Deployment redeploymentRecord = new Deployment();
            redeploymentRecord.setDeploymentId(newDeploymentId);
            redeploymentRecord.setGitRepoUrl(existingDeployment.getGitRepoUrl());
            redeploymentRecord.setGitBranch(existingDeployment.getGitBranch());
            redeploymentRecord.setAppName(existingDeployment.getAppName());
            redeploymentRecord.setVersion(existingDeployment.getVersion()); 
            redeploymentRecord.setUser(currentUser); 
            redeploymentRecord.setApplication(currentApplication); 
            redeploymentRecord.setStatus(DeploymentStatus.PENDING);
            redeploymentRecord.setDeploymentDate(LocalDateTime.now());

            if (ec2PublicIp != null && !ec2PublicIp.isEmpty() && !ec2PublicIp.equalsIgnoreCase("YOUR_EC2_ELASTIC_IP") /* Add more specific checks */) {
                nipIoUrl = String.format("http://%s.%s.nip.io", newDeploymentId, ec2PublicIp);
                redeploymentRecord.setDeploymentUrl(nipIoUrl);
                logger.info("Constructed nip.io URL for redeploy: {}", nipIoUrl);
            } else {
                logger.warn("EC2 Public IP not configured correctly for redeploy. nip.io URL will not be set for deployment {}.", newDeploymentId);
            }

            savedRedeploymentRecord = deploymentRepository.save(redeploymentRecord);
            logger.info("Redeployment record saved for new ID: {} with URL: {}", newDeploymentId, savedRedeploymentRecord.getDeploymentUrl());

            cloneDirectoryPath = Files.createTempDirectory("clone-" + newDeploymentId);
            performGitClone(cloneDirectoryPath, savedRedeploymentRecord.getGitRepoUrl(), savedRedeploymentRecord.getGitBranch());
            performS3Upload(newDeploymentId, cloneDirectoryPath, savedRedeploymentRecord);

            redisQueueService.enqueueDeploymentTask(newDeploymentId);
            logger.info("Redeployment task enqueued for new ID: {}", newDeploymentId);
            updateDeploymentStatus(savedRedeploymentRecord, DeploymentStatus.QUEUED, "Redeployment task enqueued.");

            return new DeployResponse(newDeploymentId, "Redeployment process initiated and enqueued.", savedRedeploymentRecord.getDeploymentUrl());
        } catch (Exception e) {
            logger.error("Error during redeployment for ID {}: {}", newDeploymentId, e.getMessage(), e);
             if (savedRedeploymentRecord != null && savedRedeploymentRecord.getId() != null) {
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

    private String deriveAppName(String repoUrl) {
        if (repoUrl == null || repoUrl.trim().isEmpty()) {
            return "default-app";
        }
        try {
            String path = new URL(repoUrl).getPath();
            String appName = path.substring(path.lastIndexOf('/') + 1);
            if (appName.endsWith(".git")) {
                appName = appName.substring(0, appName.length() - 4);
            }
            return appName.isEmpty() ? "default-app" : appName;
        } catch (MalformedURLException e) {
            logger.warn("Could not derive app name from malformed Git URL: {}. Using 'default-app'. Error: {}", repoUrl, e.getMessage());
            return "default-app";
        } catch (StringIndexOutOfBoundsException e) {
            logger.warn("Could not derive app name from Git URL structure: {}. Using 'default-app'. Error: {}", repoUrl, e.getMessage());
            return "default-app";
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
        
        // The S3 URL is for internal reference or direct S3 access, not the primary deploymentUrl for nip.io
        String s3ArtifactMessage = String.format("Artifacts uploaded to S3. Base S3 Path: s3://%s/%s/", s3BucketName, deploymentId);
        updateDeploymentStatus(deploymentRecord, DeploymentStatus.UPLOAD_COMPLETE, s3ArtifactMessage);
    }

    private void updateDeploymentStatus(Deployment deploymentRecord, DeploymentStatus status, String message) {
        if (deploymentRecord == null || deploymentRecord.getId() == null) {
            logger.warn("Attempted to update status for a null or unsaved deployment record.");
            return;
        }
        Deployment freshDeployment = deploymentRepository.findById(deploymentRecord.getId())
                .orElseGet(() -> {
                    logger.warn("Deployment record with ID {} not found for status update. Using passed record (this might be risky if detached).", deploymentRecord.getId());
                    return deploymentRecord;
                });

        freshDeployment.setStatus(status);
        if (status == DeploymentStatus.FAILED) {
            freshDeployment.setErrorMessage(message);
            freshDeployment.setDeploymentUrl(null); // Clear URL on failure
        } else {
            freshDeployment.setErrorMessage(null); // Clear error message on non-FAILED statuses
            // The primary deploymentUrl (nip.io) is set during startDeploy/redeploy.
            // This method logs messages related to other statuses but doesn't change the primary deploymentUrl.
            if (status == DeploymentStatus.UPLOAD_COMPLETE) {
                 logger.info("S3 Upload complete for deployment {}. S3 artifact info: {}", freshDeployment.getDeploymentId(), message);
            } else if (status == DeploymentStatus.QUEUED || status == DeploymentStatus.DEPLOYED || status == DeploymentStatus.SUCCESS) {
                 logger.info("Deployment {} status {} with message: {}", freshDeployment.getDeploymentId(), status, message);
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