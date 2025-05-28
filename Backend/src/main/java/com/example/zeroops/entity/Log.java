// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\entity\Log.java
package com.example.zeroops.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "logs")
public class Log {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id", nullable = false)
    private Deployment deployment;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Lob // For potentially long log messages
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(length = 20) // e.g., INFO, ERROR, DEBUG
    private String level;

    // Constructors
    public Log() {
    }

    public Log(Deployment deployment, LocalDateTime timestamp, String message, String level) {
        this.deployment = deployment;
        this.timestamp = timestamp;
        this.message = message;
        this.level = level;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Deployment getDeployment() {
        return deployment;
    }

    public void setDeployment(Deployment deployment) {
        this.deployment = deployment;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }
}