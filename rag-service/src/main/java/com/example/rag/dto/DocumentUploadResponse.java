package com.example.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadResponse {

    private Boolean success;

    private Long documentId;

    private String filename;

    private String fileType;

    private Long fileSize;

    private Integer chunksCreated;

    private Boolean processed;

    private String message;
}
