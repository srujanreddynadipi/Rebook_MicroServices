package com.example.rag.service;

import com.example.rag.dto.SimilarChunk;
import com.example.rag.model.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PromptBuilderService {

    @Value("${rag.system-prompt:You are a helpful AI assistant. Answer questions based on the provided context. If the context doesn't contain relevant information, say so clearly.}")
    private String systemPrompt;

    @Value("${rag.max-context-length:3000}")
    private int maxContextLength;

    /**
     * Build RAG prompt with context and user query
     * 
     * @param userQuery     The user's question
     * @param similarChunks Similar document chunks for context
     * @return Complete prompt for LLM
     */
    public String buildRagPrompt(String userQuery, List<SimilarChunk> similarChunks) {
        log.debug("Building RAG prompt for query: {}", userQuery);

        StringBuilder prompt = new StringBuilder();

        // Add system instruction
        prompt.append("System: ").append(systemPrompt).append("\n\n");

        // Add context from similar chunks
        if (similarChunks != null && !similarChunks.isEmpty()) {
            prompt.append("Context from your documents:\n");
            prompt.append("---\n");

            int contextLength = 0;
            int chunksUsed = 0;

            for (SimilarChunk chunk : similarChunks) {
                String chunkContent = chunk.getContent();

                // Check if adding this chunk exceeds max length
                if (contextLength + chunkContent.length() > maxContextLength) {
                    log.debug("Reached max context length, stopping at {} chunks", chunksUsed);
                    break;
                }

                prompt.append("[Source: ")
                        .append(chunk.getDocumentName())
                        .append(" (Chunk ")
                        .append(chunk.getChunkIndex())
                        .append(", Similarity: ")
                        .append(String.format("%.2f", chunk.getSimilarity()))
                        .append(")]\n");
                prompt.append(chunkContent).append("\n\n");

                contextLength += chunkContent.length();
                chunksUsed++;
            }

            prompt.append("---\n\n");

            log.info("Added {} chunks to context (total length: {} chars)",
                    chunksUsed, contextLength);
        } else {
            prompt.append("No relevant context found in your documents.\n\n");
            log.warn("No similar chunks provided for RAG prompt");
        }

        // Add user query
        prompt.append("User Question: ").append(userQuery).append("\n\n");
        prompt.append("Assistant: ");

        return prompt.toString();
    }

    /**
     * Build prompt with conversation history
     * 
     * @param userQuery           Current user query
     * @param similarChunks       Similar document chunks
     * @param conversationHistory Previous messages
     * @return Complete prompt with history
     */
    public String buildRagPromptWithHistory(
            String userQuery,
            List<SimilarChunk> similarChunks,
            List<ChatMessage> conversationHistory) {

        log.debug("Building RAG prompt with history for query: {}", userQuery);

        StringBuilder prompt = new StringBuilder();

        // Add system instruction
        prompt.append("System: ").append(systemPrompt).append("\n\n");

        // Add context from similar chunks
        if (similarChunks != null && !similarChunks.isEmpty()) {
            prompt.append("Relevant Context:\n");
            prompt.append("---\n");

            int contextLength = 0;
            for (SimilarChunk chunk : similarChunks) {
                String chunkContent = chunk.getContent();

                if (contextLength + chunkContent.length() > maxContextLength) {
                    break;
                }

                prompt.append(chunkContent).append("\n\n");
                contextLength += chunkContent.length();
            }

            prompt.append("---\n\n");
        }

        // Add conversation history (last few messages)
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            prompt.append("Previous Conversation:\n");

            int historyCount = Math.min(conversationHistory.size(), 5); // Last 5 exchanges
            List<ChatMessage> recentHistory = conversationHistory
                    .subList(Math.max(0, conversationHistory.size() - historyCount),
                            conversationHistory.size());

            for (ChatMessage msg : recentHistory) {
                prompt.append("User: ").append(msg.getUserMessage()).append("\n");
                prompt.append("Assistant: ").append(msg.getAssistantResponse()).append("\n\n");
            }
        }

        // Add current query
        prompt.append("User: ").append(userQuery).append("\n");
        prompt.append("Assistant: ");

        return prompt.toString();
    }

    /**
     * Build simple prompt without RAG context
     * 
     * @param userQuery The user query
     * @return Simple prompt
     */
    public String buildSimplePrompt(String userQuery) {
        return String.format("%s\n\nUser: %s\n\nAssistant: ",
                systemPrompt, userQuery);
    }

    /**
     * Extract context summary from chunks
     * 
     * @param chunks List of similar chunks
     * @return Context summary string
     */
    public String extractContextSummary(List<SimilarChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return "No context used";
        }

        return chunks.stream()
                .map(chunk -> String.format("%s (chunk %d, score: %.2f)",
                        chunk.getDocumentName(),
                        chunk.getChunkIndex(),
                        chunk.getSimilarity()))
                .collect(Collectors.joining("; "));
    }

    /**
     * Truncate text to maximum length
     * 
     * @param text      Text to truncate
     * @param maxLength Maximum length
     * @return Truncated text
     */
    public String truncateText(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }

        return text.substring(0, maxLength) + "...";
    }
}
