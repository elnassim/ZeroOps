package com.example.zeroops.controller;

import com.example.zeroops.dto.LoginRequestDTO;
import com.example.zeroops.dto.LoginResponseDTO;
import com.example.zeroops.dto.RegisterRequestDTO;
import com.example.zeroops.dto.UserResponseDTO;
import com.example.zeroops.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor // Lombok for constructor injection
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> register(@RequestBody RegisterRequestDTO dto) {
        try {
            UserResponseDTO createdUser = authService.register(dto);
            return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            // Handle specific exceptions better, e.g., email conflict
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null); // Or a DTO with an error message
        }
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@RequestBody LoginRequestDTO dto) {
        try {
            LoginResponseDTO response = authService.login(dto);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            // Handle specific exceptions better, e.g., bad credentials
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null); // Or a DTO with an error message
        }
    }
}