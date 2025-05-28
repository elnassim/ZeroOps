package com.example.zeroops.repository;

import com.example.zeroops.entity.Deployment;
import com.example.zeroops.entity.DeploymentStatus; // Ensure this is the correct enum
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, Long> {
    Optional<Deployment> findByDeploymentId(String deploymentId);
    List<Deployment> findByUser_IdOrderByDeploymentDateDesc(Long userId); // Existing method
    List<Deployment> findAllByOrderByDeploymentDateDesc(); // Existing method for admin (if used)
    Optional<Deployment> findByDeploymentIdAndUser_Id(String deploymentId, Long userId);
    // New method for pagination and filtering
    Page<Deployment> findByUser_IdAndStatusInAndVersionIn(
            Long userId,
            List<DeploymentStatus> statuses,
            List<String> versions, // Assuming 'version' field in Deployment entity is used for branch
            Pageable pageable
    );

    // Overloaded method if only statuses are provided
    Page<Deployment> findByUser_IdAndStatusIn(
            Long userId,
            List<DeploymentStatus> statuses,
            Pageable pageable
    );

    // Overloaded method if only branches (versions) are provided
    Page<Deployment> findByUser_IdAndVersionIn(
            Long userId,
            List<String> versions,
            Pageable pageable
    );
    
    // Overloaded method if no filters are provided (just pagination for user)
    Page<Deployment> findByUser_Id(
            Long userId,
            Pageable pageable
    );
}