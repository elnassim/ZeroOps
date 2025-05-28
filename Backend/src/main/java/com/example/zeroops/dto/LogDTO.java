// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\dto\LogDTO.java
package com.example.zeroops.dto;

import java.time.LocalDateTime;

public class LogDTO {
    private Long id;
    private LocalDateTime timestamp;
    private String message;
    private String level;

    public LogDTO() {
    }

    public LogDTO(Long id, LocalDateTime timestamp, String message, String level) {
        this.id = id;
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