// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\controller\LogController.java
package com.example.zeroops.controller;

import com.example.zeroops.dto.LogDTO;
import com.example.zeroops.service.LogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deployments") // Base path from your plan
public class LogController {

    private final LogService logService;

    @Autowired
    public LogController(LogService logService) {
        this.logService = logService;
    }

    @GetMapping("/{deploymentId}/logs")
    public ResponseEntity<List<LogDTO>> getDeploymentLogs(
            @PathVariable String deploymentId,
            @RequestParam(defaultValue = "50") int limit) {
        List<LogDTO> logs = logService.getLogsForDeployment(deploymentId, limit);
        return ResponseEntity.ok(logs);
    }
}