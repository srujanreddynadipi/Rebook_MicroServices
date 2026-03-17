package com.example.rag.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class ChunkingUtil {

    private static final int DEFAULT_CHUNK_SIZE = 500;
    private static final int DEFAULT_OVERLAP = 100;

    /**
     * Splits text into chunks with specified size and overlap
     * 
     * @param text The text to chunk
     * @return List of text chunks
     */
    public List<String> chunkText(String text) {
        return chunkText(text, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
    }

    /**
     * Splits text into chunks with custom size and overlap
     * 
     * @param text      The text to chunk
     * @param chunkSize The size of each chunk in characters
     * @param overlap   The overlap between chunks in characters
     * @return List of text chunks
     */
    public List<String> chunkText(String text, int chunkSize, int overlap) {
        List<String> chunks = new ArrayList<>();

        if (text == null || text.trim().isEmpty()) {
            log.warn("Empty text provided for chunking");
            return chunks;
        }

        // Clean the text
        text = text.trim();

        int textLength = text.length();

        // If text is shorter than chunk size, return as single chunk
        if (textLength <= chunkSize) {
            chunks.add(text);
            return chunks;
        }

        int start = 0;

        while (start < textLength) {
            int end = Math.min(start + chunkSize, textLength);

            // Try to break at sentence boundary if possible
            if (end < textLength) {
                int lastPeriod = text.lastIndexOf('.', end);
                int lastQuestion = text.lastIndexOf('?', end);
                int lastExclamation = text.lastIndexOf('!', end);
                int lastNewline = text.lastIndexOf('\n', end);

                int sentenceBoundary = Math.max(
                        Math.max(lastPeriod, lastQuestion),
                        Math.max(lastExclamation, lastNewline));

                // Only use sentence boundary if it's within reasonable range
                if (sentenceBoundary > start + (chunkSize / 2)) {
                    end = sentenceBoundary + 1;
                }
            }

            String chunk = text.substring(start, end).trim();

            if (!chunk.isEmpty()) {
                chunks.add(chunk);
                log.debug("Created chunk {} with length {}", chunks.size(), chunk.length());
            }

            // Move forward safely to avoid oscillation
            start = start + chunkSize - overlap;

            // Safety guard to prevent infinite loops
            if (start < 0 || start >= textLength) {
                break;
            }
        }

        log.info("Text chunked into {} chunks (chunk_size={}, overlap={})",
                chunks.size(), chunkSize, overlap);

        return chunks;
    }

    /**
     * Estimates token count (approximation: 1 token ≈ 4 characters)
     * 
     * @param text The text to estimate
     * @return Estimated token count
     */
    public int estimateTokenCount(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return text.length() / 4;
    }

    /**
     * Cleans text for better chunking
     * 
     * @param text The text to clean
     * @return Cleaned text
     */
    public String cleanText(String text) {
        if (text == null) {
            return "";
        }

        // Remove excessive whitespace
        text = text.replaceAll("\\s+", " ");

        // Remove excessive newlines
        text = text.replaceAll("\\n{3,}", "\n\n");

        return text.trim();
    }
}
