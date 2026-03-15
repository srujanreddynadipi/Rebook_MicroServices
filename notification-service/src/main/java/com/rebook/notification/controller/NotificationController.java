package com.rebook.notification.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.server.ResponseStatusException;

import com.rebook.notification.dto.NotificationResponse;
import com.rebook.notification.mapper.NotificationMapper;
import com.rebook.notification.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;

    @GetMapping
    public Page<NotificationResponse> getMyNotifications(
            @RequestHeader(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            Pageable pageable) {
        return notificationService.getNotificationsForUser(resolveUserId(userId, xUserId), pageable)
                .map(notificationMapper::toResponse);
    }

    @GetMapping("/unread-count")
    public long getUnreadCount(
            @RequestHeader(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId) {
        return notificationService.getUnreadCount(resolveUserId(userId, xUserId));
    }

    @PutMapping("/{id}/read")
    public void markAsRead(
            @PathVariable Long id,
            @RequestHeader(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId) {
        notificationService.markAsRead(id, resolveUserId(userId, xUserId));
    }

    @PutMapping("/read-all")
    public void markAllAsRead(
            @RequestHeader(value = "userId", required = false) String userId,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId) {
        notificationService.markAllAsRead(resolveUserId(userId, xUserId));
    }

    private Long resolveUserId(String userId, String xUserId) {
        try {
            if (userId != null && !userId.isBlank()) {
                return Long.parseLong(userId);
            }
            if (xUserId != null && !xUserId.isBlank()) {
                return Long.parseLong(xUserId);
            }
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid user id format", e);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing user id header");
    }
}
