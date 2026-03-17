package com.example.rag.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ai")
@Data
public class AIProperties {
    
    private String provider = "gemini"; // openai or gemini
    
    private OpenAI openai = new OpenAI();
    private Gemini gemini = new Gemini();
    
    @Data
    public static class OpenAI {
        private String apiKey;
        private String embeddingModel = "text-embedding-ada-002";
        private String chatModel = "gpt-3.5-turbo";
        private Double temperature = 0.7;
        private Integer maxTokens = 1000;
    }
    
    @Data
    public static class Gemini {
        private String apiKey;
        private String projectId;
        private String location = "us-central1";
        private String embeddingModel = "textembedding-gecko@003";
        private String chatModel = "gemini-pro";
        private Double temperature = 0.7;
        private Integer maxTokens = 1000;
    }
}
