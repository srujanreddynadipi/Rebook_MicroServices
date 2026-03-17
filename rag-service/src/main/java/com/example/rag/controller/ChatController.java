package com.example.rag.controller;

import com.example.rag.dto.ChatRequest;
import com.example.rag.dto.ChatResponse;
import com.example.rag.model.ChatMessage;
import com.example.rag.model.User;
import com.example.rag.service.ChatService;
import com.example.rag.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/rag/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;

    /**
     * Main chat endpoint - Process user message with RAG
     * 
     * POST /api/chat
     * 
     * Request body:
     * {
     * "message": "What is the main topic of my documents?",
     * "sessionId": "optional-session-id",
     * "maxResults": 5,
     * "similarityThreshold": 0.7
     * }
     * 
     * Response:
     * {
     * "response": "Based on your documents...",
     * "sessionId": "uuid",
     * "modelUsed": "openai",
     * "tokensUsed": 250,
     * "chunksUsed": 3,
     * "sourceDocuments": ["doc1.pdf", "doc2.txt"],
     * "timestamp": "2026-02-16T10:30:00"
     * }
     */
    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Chat request received from user: {}", userDetails.getUsername());

        // In a real implementation, you would fetch the User entity
        // For now, we'll create a mock user (you'll replace this with actual user
        // retrieval)
        User user = getCurrentUser(userDetails);

        ChatResponse response = chatService.chat(request, user);

        log.info("Chat response generated successfully");

        return ResponseEntity.ok(response);
    }

    /**
     * Get chat history for current user
     * 
     * GET /api/chat/history?limit=10
     */
    @GetMapping("/history")
    public ResponseEntity<List<ChatMessage>> getChatHistory(
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Fetching chat history for user: {}", userDetails.getUsername());

        User user = getCurrentUser(userDetails);
        List<ChatMessage> history = chatService.getChatHistory(user.getId(), limit);

        return ResponseEntity.ok(history);
    }

    /**
     * Get chat history for specific session
     * 
     * GET /api/chat/session/{sessionId}
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<ChatMessage>> getSessionHistory(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Fetching session history: {}", sessionId);

        List<ChatMessage> history = chatService.getSessionHistory(sessionId);

        return ResponseEntity.ok(history);
    }

    /**
     * Clear chat history for session
     * 
     * DELETE /api/chat/session/{sessionId}
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Map<String, String>> clearSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Clearing session: {}", sessionId);

        chatService.clearSession(sessionId);

        return ResponseEntity.ok(Map.of(
                "message", "Session cleared successfully",
                "sessionId", sessionId));
    }

    /**
     * Health check endpoint
     * 
     * GET /api/chat/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "ChatService"));
    }

    /**
     * Helper method to get current user
     */
    private User getCurrentUser(UserDetails userDetails) {
        return userService.getOrCreateGatewayUser(userDetails.getUsername());
    }
}
