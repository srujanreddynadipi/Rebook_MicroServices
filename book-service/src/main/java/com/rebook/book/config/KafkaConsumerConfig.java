package com.rebook.book.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rebook.book.entity.BookStatus;
import com.rebook.book.service.BookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Component
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    private final BookService bookService;
    private final ObjectMapper objectMapper;

    public KafkaConsumerConfig(BookService bookService, ObjectMapper objectMapper) {
        this.bookService = bookService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "request-events", groupId = "book-service")
    public void handleRequestEvent(String message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = objectMapper.readValue(message, Map.class);

            String eventType = (String) event.get("eventType");
            Object bookIdObj = event.get("bookId");

            if (eventType == null || bookIdObj == null) {
                log.warn("Received request-event with missing eventType or bookId: {}", message);
                return;
            }

            Long bookId = Long.valueOf(bookIdObj.toString());

            switch (eventType) {
                case "REQUEST_CREATED" -> bookService.incrementBookPopularity(bookId);
                case "REQUEST_APPROVED" -> bookService.updateBookStatus(bookId, BookStatus.BORROWED);
                case "REQUEST_RETURNED" -> bookService.updateBookStatus(bookId, BookStatus.AVAILABLE);
                default -> log.debug("Ignoring unrecognised request event type: {}", eventType);
            }
        } catch (ResponseStatusException e) {
            log.warn("Book not found while processing event: {} — {}", message, e.getMessage());
        } catch (Exception e) {
            log.error("Failed to process request-event: {}", message, e);
        }
    }
}
