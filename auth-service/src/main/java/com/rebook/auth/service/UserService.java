package com.rebook.auth.service;

import com.rebook.auth.dto.request.UpdateProfileRequest;
import com.rebook.auth.dto.response.UserResponse;
import com.rebook.auth.entity.User;
import com.rebook.auth.exception.ResourceNotFoundException;
import com.rebook.auth.mapper.UserMapper;
import com.rebook.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final RestTemplate restTemplate;

    @Value("${app.book-service.url:http://localhost:8082}")
    private String bookServiceUrl;

    public UserService(UserRepository userRepository, UserMapper userMapper, RestTemplate restTemplate) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.restTemplate = restTemplate;
    }

    public UserResponse getProfile(Long userId) {
        UserResponse response = userMapper.toResponse(findUserOrThrow(userId));
        enrichWithBookStatistics(response);
        return response;
    }

    public UserResponse getUserById(Long userId) {
        UserResponse response = userMapper.toResponse(findUserOrThrow(userId));
        enrichWithBookStatistics(response);
        return response;
    }

    private void enrichWithBookStatistics(UserResponse response) {
        if (response == null || response.getId() == null) {
            return;
        }
        try {
            String url = bookServiceUrl + "/api/users/" + response.getId() + "/stats";
            ResponseEntity<BookStatsDto> statsResponse = restTemplate.getForEntity(url, BookStatsDto.class);
            if (statsResponse.getStatusCode().is2xxSuccessful() && statsResponse.getBody() != null) {
                response.setTotalBooksDonated(statsResponse.getBody().getDonated());
                response.setTotalBooksLent(statsResponse.getBody().getLent());
            }
        } catch (Exception e) {
            logger.warn("Could not fetch book statistics for user {}: {}", response.getId(), e.getMessage());
            response.setTotalBooksDonated(0);
            response.setTotalBooksLent(0);
        }
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);
        userMapper.updateUserFromRequest(request, user);
        return userMapper.toResponse(userRepository.save(user));
    }

    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(userMapper::toResponse);
    }

    @Transactional
    public void banUser(Long userId) {
        User user = findUserOrThrow(userId);
        user.setBanned(true);
        userRepository.save(user);
    }

    @Transactional
    public void unbanUser(Long userId) {
        User user = findUserOrThrow(userId);
        user.setBanned(false);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        findUserOrThrow(userId);
        userRepository.deleteById(userId);
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with id: " + userId));
    }

    // Inner DTO for book-service stats response
    @lombok.Data
    static class BookStatsDto {
        private Integer donated;
        private Integer lent;
    }
}
