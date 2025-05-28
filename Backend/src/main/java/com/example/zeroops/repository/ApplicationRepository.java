package com.example.zeroops.repository;

import com.example.zeroops.entity.Application;
import com.example.zeroops.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    // This might be used by redeploy if it needs to look up an application
    // based on user and repoUrl to link to the new deployment.
    // If redeploy directly copies the Application object from the old deployment,
    // this specific find method might not be strictly necessary for that flow.
    Optional<Application> findByUserAndRepositoryUrl(User user, String repositoryUrl);

    // Remove findByRepositoryUrlAndUser if it was only for the abandoned pattern
    // Optional<Application> findByRepositoryUrlAndUser(String repositoryUrl, User user);
}