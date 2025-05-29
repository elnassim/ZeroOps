package com.example.zeroops.entity;

import com.example.zeroops.model.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deployments")
@Getter
@Setter
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "UUID")
    private Long id;

    @Column(name = "deployment_id", nullable = false, unique = true)
    private String deploymentId; // Ensure this is the field name

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // Nullable if User is optional for some deployments
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id") // Nullable if Application is optional
    private Application application;

    @Column(name = "app_name", nullable = false)
    private String appName;

    @Column(name = "version", nullable = false)
    private String version;

    @Column(name = "git_repo_url", nullable = false)
    private String gitRepoUrl;

    @Column(name = "git_branch", nullable = false)
    private String gitBranch;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DeploymentStatus status;

    @Column(name = "deployment_date", nullable = false, updatable = false)
    private LocalDateTime deploymentDate;

    @Column(name = "ended_at")
    private LocalDateTime endedAt; // Ensure this field exists

    @Column(name = "deployment_url", length = 512)
    private String deploymentUrl;

    @Column(name = "duration_seconds")
    private Long durationSeconds; // Ensure this field exists

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public String getDeploymentUrl() {
        return deploymentUrl;
    }

    public void setDeploymentUrl(String deploymentUrl) {
        this.deploymentUrl = deploymentUrl;
    }

    // Lombok will generate getters and setters
}