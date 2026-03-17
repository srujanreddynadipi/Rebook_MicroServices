package com.example.rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.ollama")
public class OllamaRoutingProperties {

    private String primaryBaseUrl = "http://localhost:11434";
    private String fallbackBaseUrl;
    private boolean enableFallback = true;

    private String chatModel = "llama3:8b";
    private String embeddingModel = "nomic-embed-text";

    private int requestTimeoutSeconds = 180;
}
