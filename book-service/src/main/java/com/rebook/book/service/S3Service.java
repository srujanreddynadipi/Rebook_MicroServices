package com.rebook.book.service;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class S3Service {

    private static final Logger LOGGER = LoggerFactory.getLogger(S3Service.class);
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final S3Client s3Client;
    private final String bucketName;

    public S3Service(S3Client s3Client, @Value("${app.aws.bucket-name}") String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    public String uploadFile(MultipartFile file, String folder) {
        validateImageFile(file);
        if (!isS3Configured()) {
            LOGGER.warn("S3 bucket is not configured. Skipping image upload.");
            return null;
        }

        String extension = extractExtension(file.getOriginalFilename());
        String key = folder + "/" + UUID.randomUUID() + "." + extension;

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return "https://" + bucketName + ".s3.amazonaws.com/" + key;
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read uploaded image", ex);
        } catch (RuntimeException ex) {
            LOGGER.warn("S3 upload failed. Skipping image upload for local/dev run.", ex);
            return null;
        }
    }

    public String uploadPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        if (!isS3Configured()) {
            LOGGER.warn("S3 bucket is not configured. Skipping PDF upload.");
            return null;
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size must be <= 5MB");
        }
        if (!"application/pdf".equalsIgnoreCase(file.getContentType())) {
            throw new IllegalArgumentException("Only application/pdf is allowed");
        }

        String extension = extractExtension(file.getOriginalFilename());
        if (!"pdf".equalsIgnoreCase(extension)) {
            extension = "pdf";
        }

        String key = "pdfs/" + UUID.randomUUID() + "." + extension;

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return "https://" + bucketName + ".s3.amazonaws.com/" + key;
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read uploaded PDF", ex);
        } catch (RuntimeException ex) {
            LOGGER.warn("S3 upload failed. Skipping PDF upload for local/dev run.", ex);
            return null;
        }
    }

    public void deleteFile(String imageKey) {
        if (!isS3Configured()) {
            return;
        }
        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(imageKey)
                    .build();
            s3Client.deleteObject(request);
        } catch (Exception ex) {
            LOGGER.warn("Failed to delete file from S3 for key {}", imageKey, ex);
        }
    }

    private String extractExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("File name is missing");
        }
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1 || lastDot == filename.length() - 1) {
            throw new IllegalArgumentException("File extension is missing");
        }
        return filename.substring(lastDot + 1).toLowerCase();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size must be <= 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Only image/jpeg, image/png, image/webp are allowed");
        }
    }

    private boolean isS3Configured() {
        return bucketName != null && !bucketName.isBlank();
    }
}
