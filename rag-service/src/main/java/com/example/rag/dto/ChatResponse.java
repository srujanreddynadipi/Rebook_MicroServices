package com.example.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {

    private String response;

    private String sessionId;

    private String modelUsed;

    private Integer tokensUsed;

    private Integer chunksUsed;

    private List<String> sourceDocuments;

    private LocalDateTime timestamp;
}
