package com.example.zeroops.service;

import com.example.zeroops.dto.DeploymentDTO;
import com.example.zeroops.entity.Application;
import com.example.zeroops.entity.Deployment;
import com.example.zeroops.entity.DeploymentStatus;
import com.example.zeroops.exception.ResourceNotFoundException;
import com.example.zeroops.model.User;
import com.example.zeroops.repository.ApplicationRepository;
import com.example.zeroops.repository.DeploymentRepository;
import com.example.zeroops.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.MalformedURLException;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DeploymentService {

    private static final Logger logger = LoggerFactory.getLogger(DeploymentService.class);
    private final DeploymentRepository deploymentRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final ApplicationRepository applicationRepository;

    @Value("${zeroops.deployment.base-url-template}")
    private String baseUrlTemplate;

    private static final String DEPLOY_QUEUE_NAME = "deploy-queue";

    @Autowired
    public DeploymentService(DeploymentRepository deploymentRepository,
                             UserRepository userRepository,
                             StringRedisTemplate stringRedisTemplate,
                             ApplicationRepository applicationRepository) {
        this.deploymentRepository = deploymentRepository;
        this.userRepository = userRepository;
        this.stringRedisTemplate = stringRedisTemplate;
        this.applicationRepository = applicationRepository;
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            logger.warn("No authenticated user found or user is anonymous.");
            throw new UsernameNotFoundException("User not authenticated");
        }
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.error("Authenticated user email {} not found in database.", email);
                    return new UsernameNotFoundException("User not found with email: " + email);
                });
        logger.debug("[DeploymentService] getCurrentAuthenticatedUser: ID = {}, Email = {}", user.getId(), user.getEmail());
        return user;
    }

    @Transactional
    public DeploymentDTO initiateNewDeployment(String gitUrlInput, String appName, String branch) {
        User currentUser = getCurrentAuthenticatedUser();
        String deploymentId = UUID.randomUUID().toString();

        // TEMPORARY WORKAROUND: Create a unique Application record for each deployment
        // This avoids conflicts if the same gitUrl is deployed multiple times by the same or different users
        // A more robust solution would involve checking if an Application with this gitUrl (and potentially branch/user)
        // already exists and reusing it, or having a clearer concept of "Project" vs "Deployment".
        Application application = new Application();
        application.setUser(currentUser);
        // Make the Git URL unique for the Application entity to avoid unique constraint violations
        // if the same repo is deployed multiple times. This is a simplification.
        String uniqueAppGitUrl = gitUrlInput + "#" + deploymentId; // Ensure uniqueness for Application entity
        application.setName(appName != null && !appName.trim().isEmpty() ? appName.trim() : appNameFromGitUrl(gitUrlInput));
        application.setGitUrl(uniqueAppGitUrl); // Store the unique version for the Application entity
        application.setRepositoryUrl(uniqueAppGitUrl); // Assuming repositoryUrl is similar for now
        application.setCreatedAt(LocalDateTime.now());
        Application savedApplication = applicationRepository.save(application);
        logger.info("TEMPORARY WORKAROUND: Created a new, unique Application record for this deployment. User ID: {}", currentUser.getId());
        logger.info("Original Git URL for cloning: {}", gitUrlInput);
        logger.info("Stored Application GitUrl (made unique): {}", uniqueAppGitUrl);
        logger.info("Stored Application RepositoryUrl (made unique): {}", uniqueAppGitUrl);


        Deployment newDeployment = new Deployment();
        newDeployment.setDeploymentId(deploymentId);
        newDeployment.setApplication(savedApplication); // Link to the (potentially new) Application
        newDeployment.setUser(currentUser);

        String deploymentAppName = (appName != null && !appName.trim().isEmpty()) ? appName.trim() : appNameFromGitUrl(gitUrlInput);
        newDeployment.setAppName(deploymentAppName);

        String trimmedGitUrl = gitUrlInput.trim();
        String actualBranch = (branch == null || branch.trim().isEmpty()) ? "main" : branch.trim();

        newDeployment.setGitRepoUrl(trimmedGitUrl);
        // Also set Deployment.gitUrl if that field exists and is intended for the original URL
        newDeployment.setGitUrl(trimmedGitUrl);

        newDeployment.setGitBranch(actualBranch);
        newDeployment.setVersion(actualBranch); // 'version' often stores the branch or tag being deployed
        newDeployment.setStatus(DeploymentStatus.PENDING);
        newDeployment.setDeploymentDate(LocalDateTime.now());

        Deployment savedDeployment = deploymentRepository.save(newDeployment);
        logger.info("New deployment record saved with ID: {} and UUID: {}", savedDeployment.getId(), savedDeployment.getDeploymentId());

        try {
            // Change from convertAndSend (Pub/Sub) to leftPush (List operation)
            stringRedisTemplate.opsForList().leftPush(DEPLOY_QUEUE_NAME, deploymentId);
            logger.info("LPUSHed deployment UUID {} to Redis list '{}'", deploymentId, DEPLOY_QUEUE_NAME);
        } catch (Exception e) {
            logger.error("Failed to LPUSH deployment UUID {} to Redis list '{}'. Error: {}", deploymentId, DEPLOY_QUEUE_NAME, e.getMessage(), e);
            // Consider how to handle this failure (e.g., set status to FAILED_TO_QUEUE, throw exception)
            // For now, we'll let the DTO be returned but the worker won't pick it up.
            // You might want to throw a custom exception or update deployment status to FAILED_QUEUEING
        }

        return convertToDTO(savedDeployment);
    }

    // Helper function to derive app name from Git URL (if not provided)
    private String appNameFromGitUrl(String gitUrl) {
        if (gitUrl == null || gitUrl.trim().isEmpty()) {
            return "Untitled Project";
        }
        try {
            String path = new URL(gitUrl).getPath();
            String repoName = path.substring(path.lastIndexOf('/') + 1);
            if (repoName.endsWith(".git")) {
                repoName = repoName.substring(0, repoName.length() - 4);
            }
            return repoName.isEmpty() ? "Untitled Project" : repoName;
        } catch (MalformedURLException e) {
            logger.warn("Could not parse app name from malformed Git URL: {}", gitUrl, e);
            return "Untitled Project";
        }
    }

    public DeploymentDTO getDeploymentDetailsById(String deploymentId) {
        logger.info("[DeploymentService] Attempting to get details for UUID: {}", deploymentId);
        User currentUser = getCurrentAuthenticatedUser();
        logger.info("[DeploymentService] Current user ID: {} attempting to access UUID: {}", currentUser.getId(), deploymentId);
        Deployment deployment = deploymentRepository.findByDeploymentIdAndUser_Id(deploymentId, currentUser.getId())
                .orElseThrow(() -> {
                    logger.warn("Deployment with UUID {} not found for user ID {}", deploymentId, currentUser.getId());
                    return new ResourceNotFoundException("Deployment not found with UUID: " + deploymentId);
                });
        logger.info("[DeploymentService] Found deployment for UUID: {} for user ID: {}", deploymentId, currentUser.getId());
        return convertToDTO(deployment);
    }

    public Page<DeploymentDTO> getDeploymentsForCurrentUser(
            List<DeploymentStatus> statuses,
            List<String> branches,
            Pageable pageable) {
        User currentUser = getCurrentAuthenticatedUser();
        Long userId = currentUser.getId();
        logger.info("[DeploymentService] getDeploymentsForCurrentUser called for User ID: {} with statuses: {} and branches: {}", userId, statuses, branches);
        Page<Deployment> deploymentPage;

        boolean hasStatuses = statuses != null && !statuses.isEmpty();
        boolean hasBranches = branches != null && !branches.isEmpty();

        if (hasStatuses && hasBranches) {
            deploymentPage = deploymentRepository.findByUser_IdAndStatusInAndVersionIn(userId, statuses, branches, pageable);
        } else if (hasStatuses) {
            deploymentPage = deploymentRepository.findByUser_IdAndStatusIn(userId, statuses, pageable);
        } else if (hasBranches) {
            deploymentPage = deploymentRepository.findByUser_IdAndVersionIn(userId, branches, pageable);
        } else {
            deploymentPage = deploymentRepository.findByUser_Id(userId, pageable);
        }
        logger.info("[DeploymentService] Found {} deployments for User ID: {}", deploymentPage.getTotalElements(), userId);
        return deploymentPage.map(this::convertToDTO);
    }

    public List<DeploymentDTO> getDeploymentsForCurrentUserOld() {
        User currentUser = getCurrentAuthenticatedUser();
        return deploymentRepository.findByUser_IdOrderByDeploymentDateDesc(currentUser.getId())
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<DeploymentDTO> getAllDeployments() {
        return deploymentRepository.findAllByOrderByDeploymentDateDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateDeploymentStatus(String deploymentId, DeploymentStatus newStatus, String deploymentUrl, String errorMessage, Long durationSeconds) {
        logger.info("[DeploymentService] Attempting to update status for UUID: {} to {}", deploymentId, newStatus);
        Deployment deployment = deploymentRepository.findByDeploymentId(deploymentId)
                .orElseThrow(() -> {
                    logger.warn("Deployment with UUID {} not found for status update.", deploymentId);
                    return new ResourceNotFoundException("Deployment not found with UUID: " + deploymentId + " for status update.");
                });

        deployment.setStatus(newStatus);
        if (deploymentUrl != null && !deploymentUrl.isEmpty()) {
            deployment.setDeploymentUrl(deploymentUrl);
        }
        if (errorMessage != null) {
            deployment.setErrorMessage(errorMessage);
        }
        if (durationSeconds != null) {
            deployment.setDurationSeconds(durationSeconds);
        }
        deploymentRepository.save(deployment);
        logger.info("[DeploymentService] Successfully updated status for UUID: {} to {}. URL: {}, Error: {}",
                deploymentId, newStatus, deployment.getDeploymentUrl(), deployment.getErrorMessage());
    }

    private DeploymentDTO convertToDTO(Deployment deployment) {
        String frontendStatus;
        if (deployment.getStatus() == DeploymentStatus.PENDING ||
                deployment.getStatus() == DeploymentStatus.QUEUED ||
                deployment.getStatus() == DeploymentStatus.IN_PROGRESS ||
                deployment.getStatus() == DeploymentStatus.CLONING_COMPLETE ||
                deployment.getStatus() == DeploymentStatus.BUILDING ||
                deployment.getStatus() == DeploymentStatus.UPLOADING ||
                deployment.getStatus() == DeploymentStatus.UPLOAD_COMPLETE) {
            frontendStatus = "processing";
        } else {
            frontendStatus = deployment.getStatus().name().toLowerCase();
        }

        String liveDeploymentUrl = null;
        if (deployment.getStatus() == DeploymentStatus.DEPLOYED && deployment.getDeploymentUrl() == null && deployment.getDeploymentId() != null) {
            liveDeploymentUrl = String.format(baseUrlTemplate, deployment.getDeploymentId());
        } else if (deployment.getDeploymentUrl() != null) {
            liveDeploymentUrl = deployment.getDeploymentUrl();
        }

        return new DeploymentDTO(
                deployment.getId(),
                deployment.getDeploymentId(),
                deployment.getAppName(),
                deployment.getVersion(), // This is the branch/tag
                frontendStatus,
                deployment.getDeploymentDate(),
                (deployment.getDurationSeconds() != null ? deployment.getDurationSeconds().intValue() : null),
                liveDeploymentUrl
        );
    }
}