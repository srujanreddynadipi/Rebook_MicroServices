package com.rebook.book.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudyMaterialAudioService {

    private static final Logger LOGGER = LoggerFactory.getLogger(StudyMaterialAudioService.class);
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt", "rtf");

    private final Tika tika;
    private final RestTemplate restTemplate;
    private final String ttsApiUrl;
    private final String apiKey;
    private final String defaultModel;
    private final String defaultVoice;
    private final String responseFormat;
    private final int maxCharsPerChunk;
    private final int maxTotalChars;

    public StudyMaterialAudioService(
            @Value("${app.audiobook.tts.api-url}") String ttsApiUrl,
            @Value("${app.audiobook.tts.api-key:}") String apiKey,
            @Value("${app.audiobook.tts.model}") String defaultModel,
            @Value("${app.audiobook.tts.voice}") String defaultVoice,
            @Value("${app.audiobook.tts.response-format:mp3}") String responseFormat,
            @Value("${app.audiobook.tts.max-chars-per-chunk:3500}") int maxCharsPerChunk,
            @Value("${app.audiobook.tts.max-total-chars:50000}") int maxTotalChars) {
        this.tika = new Tika();
        this.restTemplate = new RestTemplate();
        this.ttsApiUrl = ttsApiUrl;
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
        this.defaultVoice = defaultVoice;
        this.responseFormat = responseFormat;
        this.maxCharsPerChunk = maxCharsPerChunk;
        this.maxTotalChars = maxTotalChars;
    }

    public AudioBookResult convertToAudiobook(MultipartFile file, String voiceOverride) {
        validateFile(file);

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Audiobook API key is not configured");
        }

        String text = extractText(file);
        if (text.isBlank()) {
            throw new IllegalArgumentException("Could not extract readable text from the uploaded file");
        }

        if (text.length() > maxTotalChars) {
            throw new IllegalArgumentException("Document is too large for conversion. Max supported text length is "
                    + maxTotalChars + " characters");
        }

        List<String> chunks = splitIntoChunks(text, maxCharsPerChunk);
        ByteArrayOutputStream combinedAudio = new ByteArrayOutputStream();

        String effectiveVoice = hasText(voiceOverride) ? voiceOverride.trim() : defaultVoice;
        for (int i = 0; i < chunks.size(); i++) {
            byte[] chunkAudio = synthesizeChunk(chunks.get(i), effectiveVoice);
            try {
                combinedAudio.write(chunkAudio);
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to combine generated audiobook chunks", ex);
            }
            LOGGER.info("Generated audiobook chunk {}/{}", i + 1, chunks.size());
        }

        String outputName = outputName(file.getOriginalFilename());
        return new AudioBookResult(outputName, combinedAudio.toByteArray(), text.length(), chunks.size());
    }

    private byte[] synthesizeChunk(String textChunk, String voice) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", defaultModel);
        payload.put("voice", voice);
        payload.put("input", textChunk);
        payload.put("format", responseFormat);

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.parseMediaType("audio/mpeg"), MediaType.APPLICATION_OCTET_STREAM));
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(ttsApiUrl, HttpMethod.POST, request, byte[].class);
            if (response.getBody() == null || response.getBody().length == 0) {
                throw new IllegalStateException("TTS API returned empty audio response");
            }
            return response.getBody();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate audiobook using configured TTS API", ex);
        }
    }

    private String extractText(MultipartFile file) {
        try (InputStream input = file.getInputStream()) {
            String extracted = tika.parseToString(input);
            return normalizeWhitespace(extracted);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to read the uploaded study material", ex);
        }
    }

    private List<String> splitIntoChunks(String text, int chunkSize) {
        List<String> chunks = new ArrayList<>();
        int start = 0;

        while (start < text.length()) {
            int end = Math.min(start + chunkSize, text.length());
            if (end < text.length()) {
                int lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start + Math.max(50, chunkSize / 3)) {
                    end = lastSpace;
                }
            }
            chunks.add(text.substring(start, end).trim());
            start = end;
            while (start < text.length() && text.charAt(start) == ' ') {
                start++;
            }
        }

        return chunks;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Study material file is required");
        }

        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Unsupported file type. Allowed: pdf, doc, docx, txt, rtf");
        }
    }

    private String extension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("File name is missing");
        }
        int dot = fileName.lastIndexOf('.');
        if (dot == -1 || dot == fileName.length() - 1) {
            throw new IllegalArgumentException("File extension is missing");
        }
        return fileName.substring(dot + 1).toLowerCase();
    }

    private String outputName(String originalFileName) {
        String base = originalFileName == null ? "study-material" : originalFileName;
        int dot = base.lastIndexOf('.');
        if (dot > 0) {
            base = base.substring(0, dot);
        }
        return base + ".mp3";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeWhitespace(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('\u0000', ' ').replaceAll("\\s+", " ").trim();
    }

    public record AudioBookResult(String fileName, byte[] audioBytes, int sourceCharCount, int chunkCount) {
    }
}
