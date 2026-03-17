package com.example.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimilarChunk {

    private Long chunkId;

    private String content;

    private Double similarity;

    private String documentName;

    private Integer chunkIndex;
}
