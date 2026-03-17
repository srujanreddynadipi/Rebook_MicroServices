package com.example.rag.service;

import com.example.rag.config.AIProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class EmbeddingService {

    private final AIProperties aiProperties;
    private final OllamaFailoverClient ollamaFailoverClient;

    public EmbeddingService(
            AIProperties aiProperties,
            OllamaFailoverClient ollamaFailoverClient) {
        this.aiProperties = aiProperties;
        this.ollamaFailoverClient = ollamaFailoverClient;
    }

    /**
     * Generate embeddings for a single text using configured AI provider
     * 
     * @param text The text to embed
     * @return Embedding vector as float array
     */
    public float[] generateEmbedding(String text) {
        if (text == null || text.trim().isEmpty()) {
            log.warn("Empty text provided for embedding");
            return new float[0];
        }

        try {
            return ollamaFailoverClient.embed(text);

        } catch (Exception e) {
            log.error("Error generating embedding: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate embedding", e);
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     * 
     * @param texts List of texts to embed
     * @return List of embedding vectors
     */
    public List<float[]> generateEmbeddings(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            log.warn("Empty text list provided for embedding");
            return List.of();
        }

        try {
            return texts.stream().map(this::generateEmbedding).toList();

        } catch (Exception e) {
            log.error("Error generating embeddings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate embeddings", e);
        }
    }

    /**
     * Get current provider name
     * 
     * @return Provider name (ollama)
     */
    public String getCurrentProvider() {
        return "ollama";
    }

    /**
     * Get embedding dimension based on provider
     * 
     * @return Embedding dimension
     */
    public int getEmbeddingDimension() {
        return 768; // Ollama nomic-embed-text embedding dimension
    }
}
