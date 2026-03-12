package com.rebook.notification.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String from;

    public void sendSimpleEmail(String to, String subject, String body) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);
            javaMailSender.send(message);
        } catch (Exception exception) {
            log.error("Failed to send email to {} with subject {}: {}", to, subject, exception.getMessage(), exception);
        }
    }

    public void sendRequestCreatedEmail(String ownerEmail, String ownerName, String bookTitle, String senderName) {
        String subject = "New ReBook request received";
        String body = buildEmailTemplate(
                ownerName,
                "You have a new request for <strong>" + safe(bookTitle) + "</strong> from <strong>" + safe(senderName)
                        + "</strong>.",
                "Open ReBook to review the request and decide whether to approve or reject it.");
        sendSimpleEmail(ownerEmail, subject, body);
    }

    public void sendRequestApprovedEmail(String senderEmail, String senderName, String bookTitle) {
        String subject = "Your ReBook request was approved";
        String body = buildEmailTemplate(
                senderName,
                "Your request for <strong>" + safe(bookTitle) + "</strong> was approved.",
                "Coordinate with the owner in ReBook and make sure the return timeline is respected.");
        sendSimpleEmail(senderEmail, subject, body);
    }

    public void sendRequestRejectedEmail(String senderEmail, String senderName, String bookTitle) {
        String subject = "Your ReBook request was not approved";
        String body = buildEmailTemplate(
                senderName,
                "Your request for <strong>" + safe(bookTitle) + "</strong> was not approved.",
                "You can continue exploring other books available in ReBook.");
        sendSimpleEmail(senderEmail, subject, body);
    }

    public void sendReturnReminderEmail(String borrowerEmail, String borrowerName, String bookTitle,
            LocalDate dueDate) {
        String subject = "Return reminder for your borrowed book";
        String body = buildEmailTemplate(
                borrowerName,
                "This is a reminder that <strong>" + safe(bookTitle) + "</strong> is due on <strong>"
                        + dueDate.format(DATE_FORMATTER) + "</strong>.",
                "Please return the book on time to keep the exchange smooth for everyone.");
        sendSimpleEmail(borrowerEmail, subject, body);
    }

    public void sendRequestReturnedEmail(String ownerEmail, String ownerName, String bookTitle) {
        String subject = "Your book has been marked as returned";
        String body = buildEmailTemplate(
                ownerName,
                "Your book <strong>" + safe(bookTitle) + "</strong> has been marked as returned.",
                "You can now make it available again for future exchanges if needed.");
        sendSimpleEmail(ownerEmail, subject, body);
    }

    private String buildEmailTemplate(String recipientName, String mainContent, String footerContent) {
        return """
                <html>
                  <body style=\"font-family: Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 24px; color: #1f2937;\">
                    <div style=\"max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;\">
                      <div style=\"background: #0f766e; color: #ffffff; padding: 20px 24px;\">
                        <h2 style=\"margin: 0; font-size: 22px;\">ReBook Notification</h2>
                      </div>
                      <div style=\"padding: 24px; line-height: 1.6;\">
                        <p style=\"margin-top: 0;\">Hello %s,</p>
                        <p>%s</p>
                        <p>%s</p>
                        <p style=\"margin-bottom: 0;\">Regards,<br/>The ReBook Team</p>
                      </div>
                    </div>
                  </body>
                </html>
                """
                .formatted(safe(recipientName), mainContent, footerContent);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "Reader" : value;
    }
}