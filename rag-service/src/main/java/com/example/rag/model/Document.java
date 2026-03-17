package com.example.rag.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(nullable = false, length = 500)
    private String filePath;

    @Column(nullable = false, length = 50)
    private String fileType; // PDF, TXT, DOCX, MARKDOWN, WEB_URL

    @Column(length = 1000)
    private String sourceUrl; // For web URLs

    @Column(nullable = false)
    private Long fileSize;

    @Lob
    @Column(columnDefinition = "TEXT")
    @JsonIgnore
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<DocumentChunk> chunks = new ArrayList<>();

    @Column(nullable = false)
    private Boolean processed = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}
