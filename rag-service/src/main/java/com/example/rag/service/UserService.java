package com.example.rag.service;

import com.example.rag.model.User;
import com.example.rag.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Get user by username
     * 
     * @param username Username
     * @return User entity
     */
    @Transactional(readOnly = true)
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Transactional
    public User getOrCreateGatewayUser(String externalUserId) {
        if (externalUserId == null || externalUserId.isBlank()) {
            throw new RuntimeException("Missing gateway user identifier");
        }

        return userRepository.findByUsername(externalUserId)
                .orElseGet(() -> userRepository.save(User.builder()
                        .username(externalUserId)
                        .password("gateway-" + UUID.randomUUID())
                        .enabled(true)
                        .role("ROLE_USER")
                        .build()));
    }

    /**
     * Get user by ID
     * 
     * @param id User ID
     * @return User entity
     */
    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + id));
    }

    /**
     * Get all users (admin only)
     * 
     * @return List of users
     */
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Check if username exists
     * 
     * @param username Username
     * @return true if exists
     */
    public boolean usernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    /**
     * Check if email exists
     * 
     * @param email Email
     * @return true if exists
     */
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Update user profile
     * 
     * @param userId User ID
     * @param email  New email (optional)
     * @return Updated user
     */
    @Transactional
    public User updateProfile(Long userId, String email) {
        User user = getUserById(userId);

        if (email != null && !email.equals(user.getEmail())) {
            if (emailExists(email)) {
                throw new RuntimeException("Email is already in use");
            }
            user.setEmail(email);
        }

        return userRepository.save(user);
    }

    /**
     * Delete user account
     * 
     * @param userId User ID
     */
    @Transactional
    public void deleteUser(Long userId) {
        User user = getUserById(userId);
        userRepository.delete(user);
        log.info("User deleted: {}", user.getUsername());
    }
}
