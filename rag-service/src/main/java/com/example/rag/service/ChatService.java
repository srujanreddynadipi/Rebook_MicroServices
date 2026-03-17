package com.example.rag.service;

import com.example.rag.config.AIProperties;
import com.example.rag.dto.ChatRequest;
import com.example.rag.dto.ChatResponse;
import com.example.rag.dto.SimilarChunk;
import com.example.rag.model.ChatMessage;
import com.example.rag.model.User;
import com.example.rag.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final SimilaritySearchService similaritySearchService;
    private final PromptBuilderService promptBuilderService;
    private final ChatMessageRepository chatMessageRepository;
    private final AIProperties aiProperties;
    private final OllamaFailoverClient ollamaFailoverClient;

    private static final int DEFAULT_MAX_CHUNKS = 5;
    private static final double DEFAULT_SIMILARITY_THRESHOLD = 0.1;

    /**
     * Process chat request with RAG pipeline
     * 
     * @param request Chat request
     * @param user    Current user
     * @return Chat response
     */
    @Transactional
    public ChatResponse chat(ChatRequest request, User user) {
        log.info("Processing chat request for user: {}", user.getUsername());

        String userMessage = request.getMessage();
        String sessionId = request.getSessionId() != null ? request.getSessionId() : UUID.randomUUID().toString();

        // Retrieve similar chunks from user's documents
        int maxChunks = request.getMaxResults() != null ? request.getMaxResults() : DEFAULT_MAX_CHUNKS;

        double threshold = request.getSimilarityThreshold() != null ? request.getSimilarityThreshold()
                : DEFAULT_SIMILARITY_THRESHOLD;

        List<SimilarChunk> similarChunks = similaritySearchService.findSimilarChunks(
                userMessage,
                user.getId(),
                maxChunks,
                threshold);

        log.info("Retrieved {} similar chunks", similarChunks.size());

        // Get conversation history if session exists
        List<ChatMessage> history = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);

        // Build RAG prompt
        String prompt = history.isEmpty() ? promptBuilderService.buildRagPrompt(userMessage, similarChunks)
                : promptBuilderService.buildRagPromptWithHistory(userMessage, similarChunks, history);

        log.debug("Generated prompt: {}", promptBuilderService.truncateText(prompt, 200));

        // Send to LLM
        String aiResponse = callLLM(prompt);

        // Extract source documents
        List<String> sourceDocuments = similarChunks.stream()
                .map(SimilarChunk::getDocumentName)
                .distinct()
                .collect(Collectors.toList());

        // Save chat history
        ChatMessage chatMessage = ChatMessage.builder()
                .user(user)
                .sessionId(sessionId)
                .userMessage(userMessage)
                .assistantResponse(aiResponse)
                .contextUsed(promptBuilderService.extractContextSummary(similarChunks))
                .modelUsed(aiProperties.getProvider())
                .tokensUsed(estimateTokens(prompt + aiResponse))
                .build();

        chatMessageRepository.save(chatMessage);

        log.info("Chat processed successfully for session: {}", sessionId);

        // Build response
        return ChatResponse.builder()
                .response(aiResponse)
                .sessionId(sessionId)
                .modelUsed(aiProperties.getProvider())
                .tokensUsed(chatMessage.getTokensUsed())
                .chunksUsed(similarChunks.size())
                .sourceDocuments(sourceDocuments)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Call configured LLM (Ollama)
     * 
     * @param promptText The prompt
     * @return LLM response
     */
    private String callLLM(String promptText) {
        try {
            String response = ollamaFailoverClient.generate(promptText);
            log.debug("LLM response received (length: {})", response.length());
            return response;

        } catch (Exception e) {
            log.error("Error calling LLM: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get response from AI model", e);
        }
    }

    /**
     * Get chat history for user
     * 
     * @param userId User ID
     * @param limit  Maximum number of messages
     * @return List of chat messages
     */
    public List<ChatMessage> getChatHistory(Long userId, int limit) {
        if (limit > 0) {
            return chatMessageRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
        } else {
            return chatMessageRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
    }

    /**
     * Get chat history for session
     * 
     * @param sessionId Session ID
     * @return List of chat messages
     */
    public List<ChatMessage> getSessionHistory(String sessionId) {
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    /**
     * Estimate token count (rough approximation)
     * 
     * @param text Text to estimate
     * @return Estimated tokens
     */
    private int estimateTokens(String text) {
        if (text == null)
            return 0;
        // Rough estimate: 1 token ≈ 4 characters
        return text.length() / 4;
    }

    /**
     * Clear chat history for session
     * 
     * @param sessionId Session ID
     */
    @Transactional
    public void clearSession(String sessionId) {
        List<ChatMessage> messages = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        chatMessageRepository.deleteAll(messages);
        log.info("Cleared {} messages from session: {}", messages.size(), sessionId);
    }
}
