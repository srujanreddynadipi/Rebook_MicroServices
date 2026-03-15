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
        UserInfo owner = safeGetUser(event.getReceiverId());
        UserInfo sender = safeGetUser(event.getSenderId());

        String title = "New book request";
        String senderName = sender != null ? sender.name() : fallbackName(event.getSenderId());
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = senderName + " requested " + bookTitle + ".";

        notificationService.createNotification(event.getReceiverId(), title, message, NotificationType.REQUEST_RECEIVED,
                event.getRequestId());

        if (owner != null && sender != null && owner.email() != null && !owner.email().isBlank()) {
            notificationService.emailService().sendRequestCreatedEmail(owner.email(), owner.name(), bookTitle,
                    sender.name());
        }
    }

    private void handleRequestApproved(BookRequestEvent event) {
        UserInfo sender = safeGetUser(event.getSenderId());

        String title = "Request approved";
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "Your request for " + bookTitle + " was approved.";

        notificationService.createNotification(event.getSenderId(), title, message, NotificationType.REQUEST_APPROVED,
                event.getRequestId());

        if (sender != null && sender.email() != null && !sender.email().isBlank()) {
            notificationService.emailService().sendRequestApprovedEmail(sender.email(), sender.name(),
                    bookTitle);
        }
    }

    private void handleRequestRejected(BookRequestEvent event) {
        UserInfo sender = safeGetUser(event.getSenderId());

        String title = "Request rejected";
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "Your request for " + bookTitle + " was not approved.";

        notificationService.createNotification(event.getSenderId(), title, message, NotificationType.REQUEST_REJECTED,
                event.getRequestId());

        if (sender != null && sender.email() != null && !sender.email().isBlank()) {
            notificationService.emailService().sendRequestRejectedEmail(sender.email(), sender.name(),
                    bookTitle);
        }
    }

    private void handleRequestReturned(BookRequestEvent event) {
        UserInfo owner = safeGetUser(event.getReceiverId());

        String title = "Book returned";
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "Your book " + bookTitle + " has been marked as returned.";

        notificationService.createNotification(event.getReceiverId(), title, message, NotificationType.REQUEST_RETURNED,
                event.getRequestId());

        if (owner != null && owner.email() != null && !owner.email().isBlank()) {
            notificationService.emailService().sendRequestReturnedEmail(owner.email(), owner.name(), bookTitle);
        }
    }

    private void handleRequestCancelled(BookRequestEvent event) {
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "The request for " + bookTitle + " was cancelled by the requester.";

        notificationService.createNotification(event.getReceiverId(), "Request cancelled", message, NotificationType.SYSTEM,
                event.getRequestId());
        log.info("Request {} was cancelled by sender {}", event.getRequestId(), event.getSenderId());
    }

    private UserInfo safeGetUser(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            return notificationService.userLookupService().getUserById(userId);
        } catch (Exception exception) {
            log.warn("Could not fetch user {} for notification enrichment: {}", userId, exception.getMessage());
            return null;
        }
    }

    private String fallbackName(Long userId) {
        return userId == null ? "Someone" : "User #" + userId;
    }

    private String fallbackBookTitle(String bookTitle) {
        if (bookTitle != null && !bookTitle.isBlank()) {
            return bookTitle;
        }
        return "your book";
    }
}