package com.rebook.notification.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rebook.notification.entity.Notification;
import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    private final UserLookupService userLookupService;

    public Notification createNotification(Long userId, String title, String message, NotificationType type,
            Long referenceId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .build();
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<Notification> getNotificationsForUser(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.markAsReadByIdAndUserId(notificationId, userId);
    }

    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    public EmailService emailService() {
        return emailService;
    }

    public UserLookupService userLookupService() {
        return userLookupService;
    }
}