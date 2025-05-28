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
    // Lombok's @Data will generate getters and setters
}