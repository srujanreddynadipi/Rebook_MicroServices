package com.example.rag.service;

import com.example.rag.dto.SimilarChunk;
import com.example.rag.model.DocumentChunk;
import com.example.rag.repository.DocumentChunkRepository;
import com.pgvector.PGvector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SimilaritySearchService {

    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;

    private static final int DEFAULT_MAX_RESULTS = 5;
    private static final double DEFAULT_SIMILARITY_THRESHOLD = 0.1;
    private static final double FALLBACK_SIMILARITY_THRESHOLD = 0.05;

    /**
     * Find similar chunks for a query
     * 
     * @param query      The user query
     * @param userId     The user ID
     * @param maxResults Maximum number of results
     * @return List of similar chunks
     */
    public List<SimilarChunk> findSimilarChunks(String query, Long userId, Integer maxResults) {
        return findSimilarChunks(query, userId, maxResults, DEFAULT_SIMILARITY_THRESHOLD);
    }

    /**
     * Find similar chunks with similarity threshold
     * 
     * @param query               The user query
     * @param userId              The user ID
     * @param maxResults          Maximum number of results
     * @param similarityThreshold Minimum similarity score (0.0 to 1.0)
     * @return List of similar chunks with scores
     */
    public List<SimilarChunk> findSimilarChunks(
            String query,
            Long userId,
            Integer maxResults,
            Double similarityThreshold) {

        log.info("Searching for similar chunks - userId: {}, maxResults: {}, threshold: {}",
                userId, maxResults, similarityThreshold);

        // Use defaults if not provided
        int limit = maxResults != null ? maxResults : DEFAULT_MAX_RESULTS;
        double threshold = similarityThreshold != null ? similarityThreshold : DEFAULT_SIMILARITY_THRESHOLD;

        // Generate embedding for query
        float[] queryEmbedding = embeddingService.generateEmbedding(query);

        if (queryEmbedding.length == 0) {
            log.error("Failed to generate query embedding");
            return List.of();
        }

        // Convert embedding to PGvector format string
        String embeddingString = convertEmbeddingToString(queryEmbedding);

        // Query database for similar chunks
        List<Object[]> results = chunkRepository.findSimilarChunksWithScore(
                userId,
                embeddingString,
                threshold,
                limit);

        // If no results found, try with lower threshold as fallback
        if (results.isEmpty() && threshold > FALLBACK_SIMILARITY_THRESHOLD) {
            log.warn("No chunks found with threshold {}. Retrying with fallback threshold {}",
                    threshold, FALLBACK_SIMILARITY_THRESHOLD);
            results = chunkRepository.findSimilarChunksWithScore(
                    userId,
                    embeddingString,
                    FALLBACK_SIMILARITY_THRESHOLD,
                    limit);
        }

        // Last resort: if still no results, return top chunks by similarity score with
        // NO threshold
        if (results.isEmpty()) {
            log.warn("Still no chunks found. Returning top {} chunks by similarity (no threshold)", limit);
            try {
                // Simple fallback: just get any chunks from user's documents
                List<DocumentChunk> topChunks = chunkRepository.findAll().stream()
                        .filter(chunk -> chunk.getDocument() != null
                                && chunk.getDocument().getUser().getId().equals(userId))
                        .limit(limit)
                        .toList();

                List<SimilarChunk> fallbackChunks = new ArrayList<>();
                for (DocumentChunk chunk : topChunks) {
                    SimilarChunk similarChunk = SimilarChunk.builder()
                            .chunkId(chunk.getId())
                            .content(chunk.getContent())
                            .similarity(0.0)
                            .documentName(chunk.getDocument().getFilename())
                            .chunkIndex(chunk.getChunkIndex())
                            .build();
                    fallbackChunks.add(similarChunk);
                }
                log.info("Returned {} chunks via final-resort fallback", fallbackChunks.size());
                return fallbackChunks;
            } catch (Exception e) {
                log.error("Final fallback also failed: {}", e.getMessage());
                return new ArrayList<>();
            }
        }

        // Convert results to DTOs
        List<SimilarChunk> similarChunks = new ArrayList<>();

        if (results.isEmpty()) {
            log.info("Found 0 similar chunks for query");
            return similarChunks;
        }

        // Extract chunk IDs and similarity scores
        List<Long> chunkIds = new ArrayList<>();
        java.util.Map<Long, Double> similarityMap = new java.util.HashMap<>();

        for (Object[] row : results) {
            try {
                Long chunkId = ((Number) row[0]).longValue();
                Double similarity = row.length > 6 ? ((Number) row[6]).doubleValue() : 0.0;
                chunkIds.add(chunkId);
                similarityMap.put(chunkId, similarity);
            } catch (Exception e) {
                log.error("Error extracting chunk ID: {}", e.getMessage());
            }
        }

        // Batch fetch all chunks with documents in one query (eliminates N+1 problem)
        List<DocumentChunk> chunks = chunkRepository.findAllByIdWithDocument(chunkIds);

        // Create a map for quick lookup
        java.util.Map<Long, DocumentChunk> chunkMap = chunks.stream()
                .collect(java.util.stream.Collectors.toMap(DocumentChunk::getId, chunk -> chunk));

        // Build SimilarChunk objects preserving the order and similarity scores
        for (Long chunkId : chunkIds) {
            DocumentChunk chunk = chunkMap.get(chunkId);
            if (chunk != null && chunk.getDocument() != null) {
                Double similarity = similarityMap.get(chunkId);
                SimilarChunk similarChunk = SimilarChunk.builder()
                        .chunkId(chunk.getId())
                        .content(chunk.getContent())
                        .similarity(similarity)
                        .documentName(chunk.getDocument().getFilename())
                        .chunkIndex(chunk.getChunkIndex())
                        .build();
                similarChunks.add(similarChunk);

                log.debug("Added chunk {} with similarity {} (content length: {})",
                        chunk.getId(), similarity,
                        chunk.getContent() != null ? chunk.getContent().length() : 0);
            } else {
                log.warn("Could not find chunk or document for chunkId: {}", chunkId);
            }
        }

        log.info("Found {} similar chunks for query", similarChunks.size());

        return similarChunks;
    }

    /**
     * Find most similar chunks (simple version without threshold)
     * 
     * @param query  The user query
     * @param userId The user ID
     * @param limit  Maximum number of results
     * @return List of document chunks
     */
    public List<DocumentChunk> findMostSimilarChunks(String query, Long userId, int limit) {
        log.info("Finding top {} similar chunks for userId: {}", limit, userId);

        // Generate embedding for query
        float[] queryEmbedding = embeddingService.generateEmbedding(query);

        if (queryEmbedding.length == 0) {
            log.error("Failed to generate query embedding");
            return List.of();
        }

        // Convert embedding to PGvector format string
        String embeddingString = convertEmbeddingToString(queryEmbedding);

        // Query database
        List<DocumentChunk> chunks = chunkRepository.findSimilarChunks(
                userId,
                embeddingString,
                limit);

        log.info("Retrieved {} chunks", chunks.size());

        return chunks;
    }

    /**
     * Convert float array to pgvector string format
     * 
     * @param embedding The embedding array
     * @return String representation for pgvector
     */
    private String convertEmbeddingToString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");

        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append(embedding[i]);
        }

        sb.append("]");
        return sb.toString();
    }

    /**
     * Calculate cosine similarity between two embeddings
     * 
     * @param embedding1 First embedding
     * @param embedding2 Second embedding
     * @return Similarity score (0.0 to 1.0)
     */
    public double calculateCosineSimilarity(float[] embedding1, float[] embedding2) {
        if (embedding1.length != embedding2.length) {
            throw new IllegalArgumentException("Embeddings must have same dimension");
        }

        double dotProduct = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;

        for (int i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
}
