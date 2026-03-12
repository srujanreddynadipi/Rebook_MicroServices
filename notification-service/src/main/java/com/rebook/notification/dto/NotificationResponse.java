package com.rebook.notification.dto;

import java.time.LocalDateTime;

import com.rebook.notification.entity.NotificationType;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotificationResponse {

    private Long id;
    private Long userId;
    private String title;
    private String message;
    private NotificationType type;
    private boolean isRead;
    private Long referenceId;
    private LocalDateTime createdAt;
}
