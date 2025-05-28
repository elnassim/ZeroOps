package com.example.zeroops.service;

import com.example.zeroops.dto.LoginRequestDTO;
import com.example.zeroops.dto.LoginResponseDTO;
import com.example.zeroops.dto.RegisterRequestDTO;
import com.example.zeroops.dto.UserResponseDTO;
import com.example.zeroops.mapper.UserMapper;
import com.example.zeroops.model.User;
import com.example.zeroops.repository.UserRepository;
import com.example.zeroops.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger; // Import Logger
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Optional for register

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor // Lombok for constructor injection
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    // private final PasswordEncoder passwordEncoder; // You might not need to inject this if not using it elsewhere
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional 
    public UserResponseDTO register(RegisterRequestDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            logger.warn("Registration attempt with existing email: {}", dto.getEmail());
            throw new RuntimeException("Error: Email is already in use!"); 
        }
        User user = userMapper.toEntity(dto); 
        // Store password in plain text - VERY INSECURE
        user.setPassword(dto.getPassword()); 
        user.setCreatedAt(LocalDateTime.now()); 

        User savedUser = userRepository.save(user);
        logger.info("User registered successfully with plain text password: {}", savedUser.getEmail());


        return new UserResponseDTO(
            savedUser.getId(),
            savedUser.getFirstName(),
            savedUser.getLastName(),
            savedUser.getEmail(),
            savedUser.getCreatedAt()
        );
    }

    public LoginResponseDTO login(LoginRequestDTO dto) {
        logger.info("Login attempt for email: {}", dto.getEmail());
        try {
            // AuthenticationManager will use the NoOpPasswordEncoder configured in SecurityConfig
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            dto.getEmail(),
                            dto.getPassword()
                    )
            );
        } catch (AuthenticationException e) {
            logger.error("Authentication failed for email {}: {}", dto.getEmail(), e.getMessage()); 
            logger.debug("Authentication exception details: ", e); 
            throw new RuntimeException("Invalid email or password", e);
        }

        logger.info("Authentication successful for email: {}", dto.getEmail());
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> {
                    logger.error("User {} not found after successful authentication. This should not happen.", dto.getEmail());
                    return new RuntimeException("User not found after successful authentication - this should not happen");
                });

        String jwtToken = jwtService.generateToken(user);
        logger.info("JWT token generated for user: {}", user.getEmail());

        return new LoginResponseDTO(
                user.getId(),
                user.getEmail(),
                jwtToken
        );
    }
}