package com.example.rag.controller;

import com.example.rag.dto.DocumentUploadResponse;
import com.example.rag.model.Document;
import com.example.rag.model.User;
import com.example.rag.service.DocumentIngestionService;
import com.example.rag.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/rag/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class DocumentController {

    private final DocumentIngestionService documentIngestionService;
    private final UserService userService;

    /**
     * Upload a document file
     * 
     * POST /api/documents/upload
     * 
     * @param file        The file to upload
     * @param userDetails Current authenticated user
     * @return Upload response with document ID
     */
    @PostMapping("/upload")
    public ResponseEntity<DocumentUploadResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User user = getCurrentUser(userDetails);

            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DocumentUploadResponse.builder()
                                .success(false)
                                .message("File is empty")
                                .build());
            }

            log.info("Uploading document for user: {}", user.getUsername());

            DocumentUploadResponse response = documentIngestionService.ingestDocument(file, user);

            if (response.getSuccess()) {
                log.info("Document uploaded successfully: {}", response.getDocumentId());
                return ResponseEntity.ok(response);
            } else {
                log.error("Document upload failed: {}", response.getMessage());
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("Error uploading document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(DocumentUploadResponse.builder()
                            .success(false)
                            .message("Failed to upload document: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Upload document from URL
     * 
     * POST /api/documents/upload-url
     * 
     * @param request     Request body containing URL
     * @param userDetails Current authenticated user
     * @return Upload response
     */
    @PostMapping("/upload-url")
    public ResponseEntity<DocumentUploadResponse> uploadFromUrl(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User user = getCurrentUser(userDetails);

            String url = request.get("url");

            if (url == null || url.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DocumentUploadResponse.builder()
                                .success(false)
                                .message("URL is required")
                                .build());
            }

            log.info("Processing URL for user: {} - URL: {}", user.getUsername(), url);

            DocumentUploadResponse response = documentIngestionService.ingestFromUrl(url, user);

            if (response.getSuccess()) {
                log.info("URL content processed successfully: {}", response.getDocumentId());
                return ResponseEntity.ok(response);
            } else {
                log.error("URL processing failed: {}", response.getMessage());
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("Error processing URL: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(DocumentUploadResponse.builder()
                            .success(false)
                            .message("Failed to process URL: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Get all documents for current user
     * 
     * GET /api/documents
     * 
     * @param userDetails Current authenticated user
     * @return List of user's documents
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listDocuments(
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User user = getCurrentUser(userDetails);

            log.info("Fetching documents for user: {}", user.getUsername());

            List<Document> documents = documentIngestionService.getUserDocuments(user.getId());

            List<Map<String, Object>> response = documents.stream()
                    .map(doc -> {
                        Map<String, Object> docMap = new HashMap<>();
                        docMap.put("id", doc.getId());
                        docMap.put("fileName", doc.getFilename());
                        docMap.put("uploadedAt", doc.getUploadedAt());
                        docMap.put("chunkCount", documentIngestionService.getChunkCount(doc.getId()));
                        return docMap;
                    })
                    .toList();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error listing documents: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get document details
     * 
     * GET /api/documents/{id}
     * 
     * @param id          Document ID
     * @param userDetails Current authenticated user
     * @return Document details
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User user = getCurrentUser(userDetails);

            Document document = documentIngestionService.getDocumentById(id);

            if (document == null || !document.getUser().getId().equals(user.getId())) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id", document.getId());
            response.put("fileName", document.getFilename());
            response.put("uploadedAt", document.getUploadedAt());
            response.put("chunkCount", documentIngestionService.getChunkCount(document.getId()));
            response.put("fileSize", document.getFileSize());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error fetching document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Delete document
     * 
     * DELETE /api/documents/{id}
     * 
     * @param id          Document ID
     * @param userDetails Current authenticated user
     * @return Success response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User user = getCurrentUser(userDetails);

            Document document = documentIngestionService.getDocumentById(id);

            if (document == null || !document.getUser().getId().equals(user.getId())) {
                return ResponseEntity.notFound().build();
            }

            log.info("Deleting document {} for user: {}", id, user.getUsername());

            documentIngestionService.deleteDocument(id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document deleted successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error deleting document: {}", e.getMessage(), e);

            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to delete document: " + e.getMessage());

            return ResponseEntity.internalServerError().body(response);
        }
    }

    private User getCurrentUser(UserDetails userDetails) {
        return userService.getOrCreateGatewayUser(userDetails.getUsername());
    }
}
