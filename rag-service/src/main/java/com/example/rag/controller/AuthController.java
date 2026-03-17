package com.example.rag.controller;

import com.example.rag.dto.AuthResponse;
import com.example.rag.dto.LoginRequest;
import com.example.rag.dto.RegisterRequest;
import com.example.rag.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private final AuthService authService;

    /**
     * Register a new user
     * 
     * POST /api/auth/register
     * 
     * Request body:
     * {
     * "username": "johndoe",
     * "email": "john@example.com",
     * "password": "securePassword123"
     * }
     * 
     * Response:
     * {
     * "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     * "type": "Bearer",
     * "userId": 1,
     * "username": "johndoe",
     * "email": "john@example.com",
     * "role": "ROLE_USER",
     * "expiresAt": "2026-02-17T10:30:00"
     * }
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration request received for username: {}", request.getUsername());

        try {
            AuthResponse response = authService.register(request);
            log.info("User registered successfully: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (RuntimeException e) {
            log.error("Registration failed: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Login user
     * 
     * POST /api/auth/login
     * 
     * Request body:
     * {
     * "username": "johndoe",
     * "password": "securePassword123"
     * }
     * 
     * Response:
     * {
     * "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     * "type": "Bearer",
     * "userId": 1,
     * "username": "johndoe",
     * "email": "john@example.com",
     * "role": "ROLE_USER",
     * "expiresAt": "2026-02-17T10:30:00"
     * }
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request received for username: {}", request.getUsername());

        try {
            AuthResponse response = authService.login(request);
            log.info("User logged in successfully: {}", request.getUsername());
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("Login failed: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Validate token
     * 
     * GET /api/auth/validate
     * Headers: Authorization: Bearer <token>
     */
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestHeader("Authorization") String authHeader) {
        log.info("Token validation request received");

        try {
            String token = authHeader.substring(7); // Remove "Bearer " prefix
            var user = authService.validateToken(token);

            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "username", user.getUsername(),
                    "userId", user.getId()));

        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "valid", false,
                    "message", "Invalid or expired token"));
        }
    }

    /**
     * Health check for auth service
     * 
     * GET /api/auth/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "AuthService"));
    }
}
