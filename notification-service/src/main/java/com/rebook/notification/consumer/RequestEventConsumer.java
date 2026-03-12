package com.rebook.notification.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.event.BookRequestEvent;
import com.rebook.notification.service.NotificationService;
import com.rebook.notification.service.UserLookupService.UserInfo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class RequestEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "request-events", groupId = "notification-service")
    public void consume(BookRequestEvent event) {
        if (event == null || event.getEventType() == null) {
            log.warn("Received null or invalid request event payload");
            return;
        }

        log.info("Received request event: {} for request {}", event.getEventType(), event.getRequestId());

        try {
            switch (event.getEventType()) {
                case "REQUEST_CREATED" -> handleRequestCreated(event);
                case "REQUEST_APPROVED" -> handleRequestApproved(event);
                case "REQUEST_REJECTED" -> handleRequestRejected(event);
                case "REQUEST_RETURNED" -> handleRequestReturned(event);
                case "REQUEST_CANCELLED" -> handleRequestCancelled(event);
                default -> log.warn("Unhandled request event type: {}", event.getEventType());
            }
        } catch (Exception exception) {
            log.error("Failed to process request event {} for request {}: {}",
                    event.getEventType(), event.getRequestId(), exception.getMessage(), exception);
        }
    }

    private void handleRequestCreated(BookRequestEvent event) {
        UserInfo owner = notificationService.userLookupService().getUserById(event.getReceiverId());
        UserInfo sender = notificationService.userLookupService().getUserById(event.getSenderId());

        String title = "New book request";
        String message = sender.name() + " requested " + event.getBookTitle() + ".";

        notificationService.createNotification(owner.id(), title, message, NotificationType.REQUEST_RECEIVED,
                event.getRequestId());
        notificationService.emailService().sendRequestCreatedEmail(owner.email(), owner.name(), event.getBookTitle(),
                sender.name());
    }

    private void handleRequestApproved(BookRequestEvent event) {
        UserInfo sender = notificationService.userLookupService().getUserById(event.getSenderId());

        String title = "Request approved";
        String message = "Your request for " + event.getBookTitle() + " was approved.";

        notificationService.createNotification(sender.id(), title, message, NotificationType.REQUEST_APPROVED,
                event.getRequestId());
        notificationService.emailService().sendRequestApprovedEmail(sender.email(), sender.name(),
                event.getBookTitle());
    }

    private void handleRequestRejected(BookRequestEvent event) {
        UserInfo sender = notificationService.userLookupService().getUserById(event.getSenderId());

        String title = "Request rejected";
        String message = "Your request for " + event.getBookTitle() + " was not approved.";

        notificationService.createNotification(sender.id(), title, message, NotificationType.REQUEST_REJECTED,
                event.getRequestId());
        notificationService.emailService().sendRequestRejectedEmail(sender.email(), sender.name(),
                event.getBookTitle());
    }

    private void handleRequestReturned(BookRequestEvent event) {
        UserInfo owner = notificationService.userLookupService().getUserById(event.getReceiverId());

        String title = "Book returned";
        String message = "Your book " + event.getBookTitle() + " has been marked as returned.";

        notificationService.createNotification(owner.id(), title, message, NotificationType.REQUEST_RETURNED,
                event.getRequestId());
        notificationService.emailService().sendRequestReturnedEmail(owner.email(), owner.name(), event.getBookTitle());
    }

    private void handleRequestCancelled(BookRequestEvent event) {
        UserInfo owner = notificationService.userLookupService().getUserById(event.getReceiverId());
        String message = "The request for " + event.getBookTitle() + " was cancelled by the requester.";

        notificationService.createNotification(owner.id(), "Request cancelled", message, NotificationType.SYSTEM,
                event.getRequestId());
        log.info("Request {} was cancelled by sender {}", event.getRequestId(), event.getSenderId());
    }
}