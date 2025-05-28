// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\service\LogService.java
package com.example.zeroops.service;

import com.example.zeroops.dto.LogDTO;
import com.example.zeroops.entity.Deployment;
import com.example.zeroops.entity.Log;
import com.example.zeroops.exception.ResourceNotFoundException;
import com.example.zeroops.repository.DeploymentRepository;
import com.example.zeroops.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LogService {

    private final LogRepository logRepository;
    private final DeploymentRepository deploymentRepository;

    @Autowired
    public LogService(LogRepository logRepository, DeploymentRepository deploymentRepository) {
        this.logRepository = logRepository;
        this.deploymentRepository = deploymentRepository;
    }

    public List<LogDTO> getLogsForDeployment(String deploymentId, int limit) {
        // Validate limit
        if (limit <= 0) {
            limit = 50; // Default limit
        } else if (limit > 500) {
            limit = 500; // Max limit
        }

        Pageable pageable = PageRequest.of(0, limit, Sort.by("timestamp").descending());

        // First, check if deployment exists to give a proper error
        Deployment deployment = deploymentRepository.findByDeploymentId(deploymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found with UUID: " + deploymentId));

        List<Log> logs = logRepository.findByDeployment_deploymentIdOrderByTimestampDesc(deploymentId, pageable);
        return logs.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Helper to add logs (e.g., from your worker process)
    public void addLog(String deploymentId, String message, String level) {
        Deployment deployment = deploymentRepository.findByDeploymentId(deploymentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cannot add log, deployment not found with UUID: " + deploymentId));
        Log newLog = new Log(deployment, LocalDateTime.now(), message, level);
        logRepository.save(newLog);
    }

    private LogDTO convertToDTO(Log log) {
        return new LogDTO(
                log.getId(),
                log.getTimestamp(),
                log.getMessage(),
                log.getLevel());
    }
}