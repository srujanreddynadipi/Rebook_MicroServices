package com.example.rag.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pgvector.PGvector;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_chunks", indexes = {
        @Index(name = "idx_document_id", columnList = "document_id"),
        @Index(name = "idx_chunk_index", columnList = "chunkIndex")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnore
    private Document document;

    @Column(nullable = false)
    private Integer chunkIndex;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private Integer tokenCount;

    @Column(columnDefinition = "vector(768)", nullable = false)
    @Type(value = com.example.rag.config.PGvectorType.class)
    private PGvector embedding;

    @Column(length = 50)
    private String embeddingModel; // ollama

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
