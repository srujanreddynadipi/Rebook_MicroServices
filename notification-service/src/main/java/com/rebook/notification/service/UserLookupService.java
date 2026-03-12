package com.rebook.notification.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLookupService {

    private final RestTemplate restTemplate;

    @Value("${app.auth-service.url}")
    private String authServiceUrl;

    @Cacheable(cacheNames = "users", key = "#userId")
    public UserInfo getUserById(Long userId) {
        try {
            ResponseEntity<AuthUserResponse> response = restTemplate.getForEntity(
                    authServiceUrl + "/api/users/" + userId,
                    AuthUserResponse.class);

            AuthUserResponse body = response.getBody();
            if (!response.getStatusCode().is2xxSuccessful() || body == null) {
                throw new IllegalStateException("User lookup returned no data for id " + userId);
            }

            return new UserInfo(body.getId(), body.getName(), body.getEmail());
        } catch (Exception exception) {
            log.error("Failed to fetch user {} from auth-service: {}", userId, exception.getMessage(), exception);
            throw new IllegalStateException("Unable to fetch user details for id " + userId, exception);
        }
    }

    public record UserInfo(Long id, String name, String email) {
    }

    @lombok.Data
    private static class AuthUserResponse {
        private Long id;
        private String name;
        private String email;
    }
}