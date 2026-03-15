package com.rebook.notification.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.rebook.notification.entity.Notification;
import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.repository.NotificationRepository;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private UserLookupService userLookupService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void createNotificationPersistsNotification() {
        Notification saved = Notification.builder().id(10L).userId(1L).title("Title").message("Message")
                .type(NotificationType.SYSTEM).referenceId(99L).build();
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        Notification result = notificationService.createNotification(1L, "Title", "Message", NotificationType.SYSTEM,
                99L);

        assertEquals(10L, result.getId());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void markAsReadIsIdempotentWhenNothingUpdated() {
        when(notificationRepository.markAsReadByIdAndUserId(5L, 9L)).thenReturn(0);

        notificationService.markAsRead(5L, 9L);

        verify(notificationRepository).markAsReadByIdAndUserId(5L, 9L);
    }

    @Test
    void markAllAsReadDelegatesToRepository() {
        notificationService.markAllAsRead(7L);

        verify(notificationRepository).markAllAsReadByUserId(eq(7L));
    }
}