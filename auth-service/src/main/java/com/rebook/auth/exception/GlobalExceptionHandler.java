package com.rebook.auth.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── Validation errors (@Valid) ────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidationErrors(MethodArgumentNotValidException ex,
            WebRequest request) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            fieldErrors.put(field, message);
        });

        return buildResponse(HttpStatus.BAD_REQUEST, "Validation failed", fieldErrors,
                request.getDescription(false));
    }

    // ── ResourceNotFoundException → 404 ──────────────────────────────────────
    // Must be declared BEFORE RuntimeException handler (subclass → most specific
    // wins,
    // but explicit ordering avoids any ambiguity).

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFound(ResourceNotFoundException ex,
            WebRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), null,
                request.getDescription(false));
    }

    // ── Access denied (authenticated but wrong role) → 403 ───────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex,
            WebRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, "Access denied", null,
                request.getDescription(false));
    }

    // ── Business logic errors (banned, bad credentials, duplicate email) ──────

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleRuntimeException(RuntimeException ex,
            WebRequest request) {
        String msg = ex.getMessage();
        HttpStatus status;
        if (msg != null && msg.contains("already registered")) {
            status = HttpStatus.CONFLICT;
        } else if (msg != null && (msg.contains("Invalid credentials") || msg.contains("expired refresh token"))) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (msg != null && msg.contains("banned")) {
            status = HttpStatus.FORBIDDEN;
        } else {
            status = HttpStatus.BAD_REQUEST;
        }
        return buildResponse(status, msg, null, request.getDescription(false));
    }

    // ── Generic fallback ──────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneric(Exception ex, WebRequest request) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), null,
                request.getDescription(false));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private ResponseEntity<Object> buildResponse(HttpStatus status, String message,
            Object details, String path) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("message", message);
        body.put("path", path);
        if (details != null) {
            body.put("details", details);
        }
        return ResponseEntity.status(status).body(body);
    }
}
