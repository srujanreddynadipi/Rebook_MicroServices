package com.rebook.request.service;

import com.rebook.request.dto.request.CreateRequestDto;
import com.rebook.request.dto.request.UpdateReturnStatusDto;
import com.rebook.request.dto.response.BookRequestResponse;
import com.rebook.request.dto.response.ReturnReminderResponse;
import com.rebook.request.entity.*;
import com.rebook.request.event.BookRequestEvent;
import com.rebook.request.repository.BookRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RequestService {

    private static final String TOPIC = "request-events";

    private final BookRequestRepository bookRequestRepository;
    private final KafkaTemplate<String, BookRequestEvent> kafkaTemplate;
    private final RestTemplate restTemplate;

    @Value("${app.book-service.url}")
    private String bookServiceUrl;

    // -------------------------------------------------------------------------
    // Create request
    // -------------------------------------------------------------------------

    public BookRequestResponse createRequest(CreateRequestDto dto, Long senderId) {
        // 1. Fetch book details from book-service
        BookDto book = fetchBook(dto.getBookId());

        // 2. Validate book availability
        if (!"AVAILABLE".equals(book.getStatus())) {
            throw new IllegalStateException("Book is not available for requests");
        }

        // 3. Sender must not be the owner
        if (book.getOwnerId().equals(senderId)) {
            throw new IllegalArgumentException("You cannot request your own book");
        }

        // 4. No duplicate PENDING request from same sender
        boolean alreadyPending = bookRequestRepository
                .findByBookIdAndSenderIdAndStatusIn(dto.getBookId(), senderId,
                        List.of(RequestStatus.PENDING))
                .isPresent();
        if (alreadyPending) {
            throw new IllegalStateException("You already have a pending request for this book");
        }

        // 5. Lending requires noOfWeeks
        if (RequestType.LENDING.equals(dto.getRequestType()) && dto.getNoOfWeeks() == null) {
            throw new IllegalArgumentException("noOfWeeks is required for LENDING requests");
        }

        // 6. Persist request
        BookRequest request = BookRequest.builder()
                .bookId(dto.getBookId())
                .senderId(senderId)
                .receiverId(book.getOwnerId())
                .requestType(dto.getRequestType())
                .status(RequestStatus.PENDING)
                .noOfWeeks(dto.getNoOfWeeks())
                .returnStatus(ReturnStatus.PENDING)
                .build();

        request = bookRequestRepository.save(request);

        // 7. Update book status to REQUESTED
        updateBookStatus(dto.getBookId(), "REQUESTED");

        // 8. Publish Kafka event
        publishEvent("REQUEST_CREATED", request, book.getTitle());

        return toResponse(request, null, null, book.getTitle());
    }

    // -------------------------------------------------------------------------
    // Approve request
    // -------------------------------------------------------------------------

    public BookRequestResponse approveRequest(Long requestId, Long approverId) {
        BookRequest request = loadRequest(requestId);
        assertReceiver(request, approverId);
        assertStatus(request, RequestStatus.PENDING);

        request.setStatus(RequestStatus.APPROVED);

        if (RequestType.LENDING.equals(request.getRequestType())) {
            request.setBorrowDate(LocalDate.now());
            request.setDueDate(LocalDate.now().plusWeeks(request.getNoOfWeeks()));
        }

        request = bookRequestRepository.save(request);

        updateBookStatus(request.getBookId(), "BORROWED");

        BookDto book = fetchBookQuietly(request.getBookId());
        publishEvent("REQUEST_APPROVED", request, book != null ? book.getTitle() : null);

        return toResponse(request, null, null, book != null ? book.getTitle() : null);
    }

    // -------------------------------------------------------------------------
    // Reject request
    // -------------------------------------------------------------------------

    public BookRequestResponse rejectRequest(Long requestId, Long rejecterId) {
        BookRequest request = loadRequest(requestId);
        assertReceiver(request, rejecterId);
        assertStatus(request, RequestStatus.PENDING);

        request.setStatus(RequestStatus.REJECTED);
        request = bookRequestRepository.save(request);

        updateBookStatus(request.getBookId(), "AVAILABLE");

        BookDto book = fetchBookQuietly(request.getBookId());
        publishEvent("REQUEST_REJECTED", request, book != null ? book.getTitle() : null);

        return toResponse(request, null, null, book != null ? book.getTitle() : null);
    }

    // -------------------------------------------------------------------------
    // Cancel request
    // -------------------------------------------------------------------------

    public BookRequestResponse cancelRequest(Long requestId, Long requesterId) {
        BookRequest request = loadRequest(requestId);
        assertSender(request, requesterId);
        assertStatus(request, RequestStatus.PENDING);

        request.setStatus(RequestStatus.CANCELLED);
        request = bookRequestRepository.save(request);

        updateBookStatus(request.getBookId(), "AVAILABLE");

        BookDto book = fetchBookQuietly(request.getBookId());
        publishEvent("REQUEST_CANCELLED", request, book != null ? book.getTitle() : null);

        return toResponse(request, null, null, book != null ? book.getTitle() : null);
    }

    // -------------------------------------------------------------------------
    // Update return status
    // -------------------------------------------------------------------------

    public BookRequestResponse updateReturnStatus(Long requestId, Long ownerId, UpdateReturnStatusDto dto) {
        BookRequest request = loadRequest(requestId);
        assertReceiver(request, ownerId);
        assertStatus(request, RequestStatus.APPROVED);

        request.setReturnStatus(dto.getReturnStatus());
        request = bookRequestRepository.save(request);

        if (ReturnStatus.RETURNED.equals(dto.getReturnStatus())) {
            updateBookStatus(request.getBookId(), "AVAILABLE");
            BookDto book = fetchBookQuietly(request.getBookId());
            publishEvent("REQUEST_RETURNED", request, book != null ? book.getTitle() : null);
        }

        return toResponse(request, null, null, null);
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<BookRequestResponse> getSentRequests(Long userId, Pageable pageable) {
        return bookRequestRepository.findBySenderId(userId, pageable)
                .map(r -> toResponse(r, null, null, null));
    }

    @Transactional(readOnly = true)
    public Page<BookRequestResponse> getReceivedRequests(Long userId, Pageable pageable) {
        return bookRequestRepository.findByReceiverId(userId, pageable)
                .map(r -> toResponse(r, null, null, null));
    }

    @Transactional(readOnly = true)
    public List<ReturnReminderResponse> getRequestsDueSoon() {
        LocalDate reminderDate = LocalDate.now().plusDays(2);
        return bookRequestRepository
                .findByStatusAndReturnStatusAndDueDate(RequestStatus.APPROVED, ReturnStatus.PENDING, reminderDate)
                .stream()
                .map(request -> {
                    BookDto book = fetchBookQuietly(request.getBookId());
                    return ReturnReminderResponse.builder()
                            .requestId(request.getId())
                            .bookId(request.getBookId())
                            .borrowerId(request.getSenderId())
                            .ownerId(request.getReceiverId())
                            .bookTitle(book != null ? book.getTitle() : "your borrowed book")
                            .dueDate(request.getDueDate())
                            .build();
                })
                .toList();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private BookRequest loadRequest(Long requestId) {
        return bookRequestRepository.findById(requestId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Request not found: " + requestId));
    }

    private void assertReceiver(BookRequest request, Long userId) {
        if (!request.getReceiverId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the book owner can perform this action");
        }
    }

    private void assertSender(BookRequest request, Long userId) {
        if (!request.getSenderId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the request sender can perform this action");
        }
    }

    private void assertStatus(BookRequest request, RequestStatus expected) {
        if (!expected.equals(request.getStatus())) {
            throw new IllegalStateException(
                    "Request is not in " + expected + " state (current: " + request.getStatus() + ")");
        }
    }

    private void updateBookStatus(Long bookId, String status) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(bookServiceUrl + "/api/books/{id}/status")
                    .queryParam("status", status)
                    .buildAndExpand(bookId)
                    .toUriString();
            restTemplate.patchForObject(url, null, Void.class);
        } catch (Exception e) {
            log.warn("Failed to update book {} status to {}: {}", bookId, status, e.getMessage());
        }
    }

    private BookDto fetchBook(Long bookId) {
        String url = bookServiceUrl + "/api/books/" + bookId;
        ResponseEntity<BookDto> response = restTemplate.getForEntity(url, BookDto.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new jakarta.persistence.EntityNotFoundException("Book not found: " + bookId);
        }
        return response.getBody();
    }

    private BookDto fetchBookQuietly(Long bookId) {
        try {
            return fetchBook(bookId);
        } catch (Exception e) {
            log.warn("Could not fetch book {}: {}", bookId, e.getMessage());
            return null;
        }
    }

    private void publishEvent(String eventType, BookRequest request, String bookTitle) {
        try {
            BookRequestEvent event = BookRequestEvent.builder()
                    .eventType(eventType)
                    .requestId(request.getId())
                    .bookId(request.getBookId())
                    .senderId(request.getSenderId())
                    .receiverId(request.getReceiverId())
                    .requestType(request.getRequestType())
                    .bookTitle(bookTitle)
                    .timestamp(LocalDateTime.now())
                    .build();
            kafkaTemplate.send(TOPIC, String.valueOf(request.getId()), event);
        } catch (Exception e) {
            log.warn("Failed to publish Kafka event {}: {}", eventType, e.getMessage());
        }
    }

    private BookRequestResponse toResponse(BookRequest r, String senderName,
            String receiverName, String bookTitle) {
        BookRequestResponse res = new BookRequestResponse();
        res.setId(r.getId());
        res.setBookId(r.getBookId());
        res.setSenderId(r.getSenderId());
        res.setReceiverId(r.getReceiverId());
        res.setRequestType(r.getRequestType());
        res.setStatus(r.getStatus());
        res.setNoOfWeeks(r.getNoOfWeeks());
        res.setBorrowDate(r.getBorrowDate());
        res.setDueDate(r.getDueDate());
        res.setReturnStatus(r.getReturnStatus());
        res.setCreatedAt(r.getCreatedAt());
        res.setSenderName(senderName);
        res.setReceiverName(receiverName);
        res.setBookTitle(bookTitle);
        return res;
    }

    // -------------------------------------------------------------------------
    // Inner DTO for book-service response
    // -------------------------------------------------------------------------

    @lombok.Data
    static class BookDto {
        private Long id;
        private String title;
        private String status;
        private Long ownerId;
    }
}
