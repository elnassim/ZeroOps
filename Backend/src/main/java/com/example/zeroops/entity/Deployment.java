package com.example.zeroops.entity;

import com.example.zeroops.model.User; // Assuming User is in this package
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "deployments")
@Getter
@Setter
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deployment_uuid", nullable = false, unique = true)
    private String deploymentId;

    @Column(name = "app_name", nullable = false)
    private String appName; // This can be derived or same as Application name

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // --- Vercel-like workflow changes START ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false) // Ensures application_id is NOT NULL
    private Application application;

    @Column(name = "version", nullable = false, length = 50) // Ensures version is NOT NULL
    private String version; // Could be branch name, commit hash, or semantic version

    @Column(name = "git_repo_url", nullable = false) // Store the repo URL for this deployment
    private String gitRepoUrl;

    @Column(name = "git_branch", nullable = false) // Store the branch for this deployment
    private String gitBranch;
    // --- Vercel-like workflow changes END ---

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DeploymentStatus status;

    @Column(name = "deployment_date", nullable = false, updatable = false)
    private LocalDateTime deploymentDate;

    private String gitUrl;

    @Column(name = "log_file_path")
    private String logFilePath;

    @Column(name = "deployment_url")
    private String deploymentUrl;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;


    public String getGitUrl() {
        return gitUrl;
    }

    public void setGitUrl(String gitUrl) { // Add this method
        this.gitUrl = gitUrl;
    }
    
    // Constructors, other methods if needed
}