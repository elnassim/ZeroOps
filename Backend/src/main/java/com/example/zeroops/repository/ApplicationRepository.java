package com.example.zeroops.repository;

import com.example.zeroops.entity.Application;
import com.example.zeroops.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    // Find an application by its name (if you still need this)
    Optional<Application> findByNameAndUser(String name, User user); // Or just findByName if name is globally unique
    Optional<Application> findByGitUrl(String gitUrl);
    // --- Vercel-like workflow: Find by user and repository URL ---
    Optional<Application> findByUserAndRepositoryUrl(User user, String repositoryUrl);

    List<Application> findAllByUser(User user); // To list all applications for a user
}