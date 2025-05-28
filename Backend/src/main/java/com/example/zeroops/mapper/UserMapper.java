package com.example.zeroops.mapper;

import org.springframework.stereotype.Component;
import com.example.zeroops.dto.RegisterRequestDTO;
import com.example.zeroops.dto.UserRequestDTO;
import com.example.zeroops.dto.UserResponseDTO;
import com.example.zeroops.model.User;

@Component
public class UserMapper {
    
    public User toEntity(RegisterRequestDTO dto) {
        return User.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .email(dto.getEmail())
                .password(dto.getPassword())
                .build();
    }
    
    public UserResponseDTO toDto(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .build();
    }
}