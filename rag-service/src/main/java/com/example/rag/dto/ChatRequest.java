package com.example.rag.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    @NotBlank(message = "Message cannot be empty")
    private String message;

    private String sessionId;

    private Integer maxResults; // Number of similar chunks to retrieve

    private Double similarityThreshold; // Minimum similarity score
}
