package com.rebook.notification.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.rebook.notification.dto.NotificationResponse;
import com.rebook.notification.mapper.NotificationMapper;
import com.rebook.notification.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;

    public Page<NotificationResponse> getNotificationsForUser(Long userId, Pageable pageable) {
        return notificationService.getNotificationsForUser(userId, pageable)
                .map(notificationMapper::toResponse);
    }
}
