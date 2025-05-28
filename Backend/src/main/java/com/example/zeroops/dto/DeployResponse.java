// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\dto\DeployResponse.java
package com.example.zeroops.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeployResponse {
    private String deploymentId;
    private String message;
    private String deploymentUrl;

    
}