// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\repository\LogRepository.java
package com.example.zeroops.repository;

import com.example.zeroops.entity.Log;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<Log, Long> {
    // Find top N logs for a given deployment ID, ordered by timestamp descending
    List<Log> findByDeployment_deploymentIdOrderByTimestampDesc(String deploymentId, Pageable pageable);

    List<Log> findByDeployment_IdOrderByTimestampDesc(Long deploymentId, Pageable pageable);
}