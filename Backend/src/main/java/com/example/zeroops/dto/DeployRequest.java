package com.example.zeroops.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeployRequest {
    private String repoUrl;
    private String branch;
    private String appName; // Ensure getter/setter for this
    private String deploymentId;
    // Lombok's @Data will generate getters and setters
}