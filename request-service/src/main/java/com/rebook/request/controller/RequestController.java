package com.rebook.request.controller;

import com.rebook.request.dto.request.CreateRequestDto;
import com.rebook.request.dto.request.UpdateReturnStatusDto;
import com.rebook.request.dto.response.BookRequestResponse;
import com.rebook.request.dto.response.ReturnReminderResponse;
import com.rebook.request.service.RequestService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    @PostMapping
    public ResponseEntity<BookRequestResponse> createRequest(
            @Valid @RequestBody CreateRequestDto dto,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(requestService.createRequest(dto, userId));
    }

    @GetMapping("/sent")
    public ResponseEntity<Page<BookRequestResponse>> getSentRequests(
            @RequestHeader("X-User-Id") Long userId,
            Pageable pageable) {
        return ResponseEntity.ok(requestService.getSentRequests(userId, pageable));
    }

    @GetMapping("/received")
    public ResponseEntity<Page<BookRequestResponse>> getReceivedRequests(
            @RequestHeader("X-User-Id") Long userId,
            Pageable pageable) {
        return ResponseEntity.ok(requestService.getReceivedRequests(userId, pageable));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<BookRequestResponse> approveRequest(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(requestService.approveRequest(id, userId));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<BookRequestResponse> rejectRequest(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(requestService.rejectRequest(id, userId));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookRequestResponse> cancelRequest(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(requestService.cancelRequest(id, userId));
    }

    @PutMapping("/{id}/return-status")
    public ResponseEntity<BookRequestResponse> updateReturnStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReturnStatusDto dto,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(requestService.updateReturnStatus(id, userId, dto));
    }

    @GetMapping("/overdue-soon")
    public ResponseEntity<List<ReturnReminderResponse>> getRequestsDueSoon() {
        return ResponseEntity.ok(requestService.getRequestsDueSoon());
    }
}
