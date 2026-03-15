package com.rebook.notification.consumer;

import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.event.NewMessageEvent;
import com.rebook.notification.service.NotificationService;
import com.rebook.notification.service.UserLookupService.UserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(
            topics = "chat-events",
            groupId = "notification-service-chat",
            containerFactory = "chatKafkaListenerContainerFactory"
    )
    public void consume(NewMessageEvent event) {
        if (event == null || event.getReceiverId() == null) {
            log.warn("Received null or invalid chat event");
            return;
        }

        log.info("Received chat event: message {} from sender {} to receiver {}",
                event.getMessageId(), event.getSenderId(), event.getReceiverId());

        try {
            String senderName = event.getSenderName();
            if (senderName == null || senderName.isBlank()) {
                try {
                    UserInfo sender = notificationService.userLookupService().getUserById(event.getSenderId());
                    senderName = sender.name();
                } catch (Exception e) {
                    log.warn("Could not look up sender name for {}: {}", event.getSenderId(), e.getMessage());
                    senderName = "Someone";
                }
            }

            String preview = event.getContent();
            if (preview != null && preview.length() > 60) {
                preview = preview.substring(0, 60) + "…";
            }

            notificationService.createNotification(
                    event.getReceiverId(),
                    "New message from " + senderName,
                    preview != null ? preview : "(no content)",
                    NotificationType.NEW_MESSAGE,
                    event.getRequestId()
            );
        } catch (Exception e) {
            log.error("Failed to process chat event for message {}: {}", event.getMessageId(), e.getMessage(), e);
        }
    }
}
