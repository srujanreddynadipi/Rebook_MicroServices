package com.example.rag.service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import com.example.rag.config.OllamaRoutingProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class OllamaFailoverClient {

    private final OllamaRoutingProperties properties;
    private final ObjectMapper objectMapper;

    public String generate(String promptText) {
        return withFailover(baseUrl -> callGenerate(baseUrl, promptText));
    }

    public float[] embed(String inputText) {
        return withFailover(baseUrl -> callEmbed(baseUrl, inputText));
    }

    private <T> T withFailover(Function<String, T> action) {
        Exception primaryException = null;

        try {
            return action.apply(properties.getPrimaryBaseUrl());
        } catch (Exception ex) {
            primaryException = ex;
            log.warn("Primary Ollama endpoint failed: {}", ex.getMessage());
        }

        if (properties.isEnableFallback() && hasText(properties.getFallbackBaseUrl())) {
            try {
                log.info("Trying fallback Ollama endpoint");
                return action.apply(properties.getFallbackBaseUrl());
            } catch (Exception fallbackEx) {
                if (primaryException != null) {
                    fallbackEx.addSuppressed(primaryException);
                }
                throw new RuntimeException("Both primary and fallback Ollama endpoints failed", fallbackEx);
            }
        }

        throw new RuntimeException("Primary Ollama endpoint failed and fallback is disabled/unconfigured",
                primaryException);
    }

    private String callGenerate(String baseUrl, String promptText) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", properties.getChatModel());
        payload.put("prompt", promptText);
        payload.put("stream", false);

        JsonNode node = post(baseUrl, "/api/generate", payload);
        String response = node.path("response").asText("");
        if (!hasText(response)) {
            throw new RuntimeException("Ollama generation returned empty response");
        }
        return response;
    }

    private float[] callEmbed(String baseUrl, String inputText) {
        Map<String, Object> oldPayload = new HashMap<>();
        oldPayload.put("model", properties.getEmbeddingModel());
        oldPayload.put("prompt", inputText);

        try {
            JsonNode oldNode = post(baseUrl, "/api/embeddings", oldPayload);
            JsonNode embeddingNode = oldNode.path("embedding");
            if (embeddingNode.isArray() && !embeddingNode.isEmpty()) {
                return toFloatArray(embeddingNode);
            }
        } catch (Exception ignored) {
            log.debug("/api/embeddings failed on {}, trying /api/embed", baseUrl);
        }

        Map<String, Object> newPayload = new HashMap<>();
        newPayload.put("model", properties.getEmbeddingModel());
        newPayload.put("input", inputText);

        JsonNode newNode = post(baseUrl, "/api/embed", newPayload);
        JsonNode embeddingsNode = newNode.path("embeddings");
        if (embeddingsNode.isArray() && embeddingsNode.size() > 0 && embeddingsNode.get(0).isArray()) {
            return toFloatArray(embeddingsNode.get(0));
        }

        throw new RuntimeException("Ollama embedding response missing vector output");
    }

    private JsonNode post(String baseUrl, String path, Map<String, Object> payload) {
        String body = WebClient.builder()
                .baseUrl(normalizeBaseUrl(baseUrl))
                .build()
                .post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .block(Duration.ofSeconds(properties.getRequestTimeoutSeconds()));

        if (!hasText(body)) {
            throw new RuntimeException("Empty response from Ollama endpoint " + normalizeBaseUrl(baseUrl) + path);
        }

        try {
            return objectMapper.readTree(body);
        } catch (Exception ex) {
            throw new RuntimeException("Invalid JSON from Ollama endpoint: " + ex.getMessage(), ex);
        }
    }

    private float[] toFloatArray(JsonNode arrayNode) {
        float[] values = new float[arrayNode.size()];
        for (int i = 0; i < arrayNode.size(); i++) {
            values[i] = (float) arrayNode.get(i).asDouble();
        }
        return values;
    }

    private String normalizeBaseUrl(String baseUrl) {
        String normalized = baseUrl == null ? "" : baseUrl.trim();
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
