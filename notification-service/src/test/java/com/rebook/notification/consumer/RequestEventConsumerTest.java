package com.rebook.notification.consumer;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.event.BookRequestEvent;
import com.rebook.notification.service.EmailService;
import com.rebook.notification.service.NotificationService;
import com.rebook.notification.service.UserLookupService;
import com.rebook.notification.service.UserLookupService.UserInfo;

@ExtendWith(MockitoExtension.class)
class RequestEventConsumerTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private RequestEventConsumer consumer;

    @Test
    void requestCreatedCreatesNotificationAndSendsEmail() {
        BookRequestEvent event = BookRequestEvent.builder()
                .eventType("REQUEST_CREATED")
                .requestId(11L)
                .senderId(2L)
                .receiverId(3L)
                .bookTitle("Clean Code")
                .build();

        when(notificationService.userLookupService()).thenReturn(userLookupService);
        when(notificationService.emailService()).thenReturn(emailService);
        when(userLookupService.getUserById(3L)).thenReturn(new UserInfo(3L, "Owner", "owner@test.com"));
        when(userLookupService.getUserById(2L)).thenReturn(new UserInfo(2L, "Sender", "sender@test.com"));

        consumer.consume(event);

        verify(notificationService).createNotification(3L, "New book request", "Sender requested Clean Code.",
                NotificationType.REQUEST_RECEIVED, 11L);
        verify(emailService).sendRequestCreatedEmail("owner@test.com", "Owner", "Clean Code", "Sender");
    }
}