package com.example.rag.repository;

import com.example.rag.model.DocumentChunk;
import com.pgvector.PGvector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

        List<DocumentChunk> findByDocumentId(Long documentId);

        Long countByDocumentId(Long documentId);

        void deleteByDocumentId(Long documentId);

        @Query(value = "SELECT dc.* FROM document_chunks dc " +
                        "JOIN documents d ON dc.document_id = d.id " +
                        "WHERE d.user_id = :userId " +
                        "ORDER BY dc.embedding <=> CAST(:queryEmbedding AS vector) " +
                        "LIMIT :limit", nativeQuery = true)
        List<DocumentChunk> findSimilarChunks(
                        @Param("userId") Long userId,
                        @Param("queryEmbedding") String queryEmbedding,
                        @Param("limit") Integer limit);

        @Query(value = "SELECT dc.id, dc.content, dc.chunk_index, dc.document_id, dc.embedding, dc.created_at, " +
                        "1 - (dc.embedding <=> CAST(:queryEmbedding AS vector)) as similarity " +
                        "FROM document_chunks dc " +
                        "JOIN documents d ON dc.document_id = d.id " +
                        "WHERE d.user_id = :userId " +
                        "AND 1 - (dc.embedding <=> CAST(:queryEmbedding AS vector)) >= :threshold " +
                        "ORDER BY similarity DESC " +
                        "LIMIT :limit", nativeQuery = true)
        List<Object[]> findSimilarChunksWithScore(
                        @Param("userId") Long userId,
                        @Param("queryEmbedding") String queryEmbedding,
                        @Param("threshold") Double threshold,
                        @Param("limit") Integer limit);

        @Query("SELECT dc FROM DocumentChunk dc JOIN FETCH dc.document WHERE dc.id IN :ids")
        List<DocumentChunk> findAllByIdWithDocument(@Param("ids") List<Long> ids);
}
