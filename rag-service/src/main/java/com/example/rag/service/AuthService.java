package com.example.rag.service;

import com.example.rag.dto.AuthResponse;
import com.example.rag.dto.LoginRequest;
import com.example.rag.dto.RegisterRequest;
import com.example.rag.model.User;
import com.example.rag.repository.UserRepository;
import com.example.rag.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /**
     * Register a new user
     * 
     * @param request Registration request
     * @return Authentication response with JWT token
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username is already taken");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        // Create new user
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("ROLE_USER")
                .enabled(true)
                .build();

        user = userRepository.save(user);

        log.info("User registered successfully: {}", user.getUsername());

        // Generate JWT token
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .roles("USER")
                .build();

        String token = jwtUtil.generateToken(userDetails);
        LocalDateTime expiresAt = LocalDateTime.ofInstant(
                jwtUtil.getExpirationDateFromToken(token).toInstant(),
                ZoneId.systemDefault());

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .expiresAt(expiresAt)
                .build();
    }

    /**
     * Authenticate user and generate JWT token
     * 
     * @param request Login request
     * @return Authentication response with JWT token
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Authenticating user: {}", request.getUsername());

        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()));

        // Get user details
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        // Fetch user entity
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate JWT token
        String token = jwtUtil.generateToken(userDetails);
        LocalDateTime expiresAt = LocalDateTime.ofInstant(
                jwtUtil.getExpirationDateFromToken(token).toInstant(),
                ZoneId.systemDefault());

        log.info("User authenticated successfully: {}", user.getUsername());

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .expiresAt(expiresAt)
                .build();
    }

    /**
     * Validate token and get user
     * 
     * @param token JWT token
     * @return User if token is valid
     */
    public User validateToken(String token) {
        String username = jwtUtil.extractUsername(token);
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Change user password
     * 
     * @param username    Username
     * @param oldPassword Old password
     * @param newPassword New password
     */
    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify old password
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Old password is incorrect");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("Password changed successfully for user: {}", username);
    }
}
