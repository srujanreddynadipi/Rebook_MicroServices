package com.rebook.auth.service;

import com.rebook.auth.dto.request.LoginRequest;
import com.rebook.auth.dto.request.RefreshTokenRequest;
import com.rebook.auth.dto.request.RegisterRequest;
import com.rebook.auth.dto.response.AuthResponse;
import com.rebook.auth.entity.Role;
import com.rebook.auth.entity.User;
import com.rebook.auth.exception.ResourceNotFoundException;
import com.rebook.auth.mapper.UserMapper;
import com.rebook.auth.repository.UserRepository;
import com.rebook.auth.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public AuthService(UserRepository userRepository,
            JwtUtil jwtUtil,
            PasswordEncoder passwordEncoder,
            UserMapper userMapper) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .mobile(request.getMobile())
                .city(request.getCity())
                .pincode(request.getPincode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .role(Role.ROLE_USER)
                .build(); 

        User savedUser = userRepository.save(user);

        return AuthResponse.builder()
                .accessToken(jwtUtil.generateAccessToken(savedUser))
                .refreshToken(jwtUtil.generateRefreshToken(savedUser))
                .tokenType("Bearer")
                .user(userMapper.toResponse(savedUser))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (user.isBanned()) {
            throw new RuntimeException("Account is banned");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        return AuthResponse.builder()
                .accessToken(jwtUtil.generateAccessToken(user))
                .refreshToken(jwtUtil.generateRefreshToken(user))
                .tokenType("Bearer")
                .user(userMapper.toResponse(user))
                .build();
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();

        if (!jwtUtil.validateRefreshToken(token)) {
            throw new RuntimeException("Invalid or expired refresh token");
        }

        Long userId = Long.parseLong(jwtUtil.extractUserId(token));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return AuthResponse.builder()
                .accessToken(jwtUtil.generateAccessToken(user))
                .refreshToken(token)
                .tokenType("Bearer")
                .user(userMapper.toResponse(user))
                .build();
    }
}
