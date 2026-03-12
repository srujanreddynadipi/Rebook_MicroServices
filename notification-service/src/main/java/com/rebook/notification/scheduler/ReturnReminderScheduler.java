package com.rebook.notification.scheduler;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.rebook.notification.dto.response.ReturnReminderResponse;
import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.service.NotificationService;
import com.rebook.notification.service.UserLookupService.UserInfo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnReminderScheduler {

    private final RestTemplate restTemplate;
    private final NotificationService notificationService;

    @Value("${app.request-service.url:http://request-service}")
    private String requestServiceUrl;

    @Scheduled(cron = "0 0 9 * * *")
    public void sendReturnReminders() {
        try {
            ReturnReminderResponse[] reminders = restTemplate.getForObject(
                    requestServiceUrl + "/api/requests/overdue-soon",
                    ReturnReminderResponse[].class);

            if (reminders == null || reminders.length == 0) {
                log.info("No return reminders to send today.");
                return;
            }

            Arrays.stream(reminders).forEach(this::processReminder);
        } catch (Exception exception) {
            log.warn(
                    "Failed to fetch due-soon requests from request-service. Future improvement: query request data directly when owned by this service. Cause: {}",
                    exception.getMessage());
        }
    }

    private void processReminder(ReturnReminderResponse reminder) {
        try {
            UserInfo borrower = notificationService.userLookupService().getUserById(reminder.getBorrowerId());

            notificationService.createNotification(
                    borrower.id(),
                    "Return reminder",
                    "Reminder: " + reminder.getBookTitle() + " is due on " + reminder.getDueDate() + ".",
                    NotificationType.RETURN_REMINDER,
                    reminder.getRequestId());

            notificationService.emailService().sendReturnReminderEmail(
                    borrower.email(),
                    borrower.name(),
                    reminder.getBookTitle(),
                    reminder.getDueDate());
        } catch (Exception exception) {
            log.error("Failed to process return reminder for request {}: {}",
                    reminder.getRequestId(), exception.getMessage(), exception);
        }
    }
}