package com.rebook.auth.service;

import com.rebook.auth.dto.request.UpdateProfileRequest;
import com.rebook.auth.dto.response.UserResponse;
import com.rebook.auth.entity.User;
import com.rebook.auth.exception.ResourceNotFoundException;
import com.rebook.auth.mapper.UserMapper;
import com.rebook.auth.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    public UserResponse getProfile(Long userId) {
        return userMapper.toResponse(findUserOrThrow(userId));
    }

    public UserResponse getUserById(Long userId) {
        return userMapper.toResponse(findUserOrThrow(userId));
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
}
