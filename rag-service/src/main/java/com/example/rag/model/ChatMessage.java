package com.example.rag.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_user_id", columnList = "user_id"),
        @Index(name = "idx_session_id", columnList = "sessionId"),
        @Index(name = "idx_created_at", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(length = 100)
    private String sessionId;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String userMessage;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String assistantResponse;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String contextUsed; // Chunks used for RAG

    @Column(length = 50)
    private String modelUsed; // openai, gemini

    @Column
    private Integer tokensUsed;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
