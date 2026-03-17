package com.rebook.book.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudyMaterialAudioService {

    private static final Logger LOGGER = LoggerFactory.getLogger(StudyMaterialAudioService.class);
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt", "rtf");

    private final Tika tika;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final String ttsApiUrl;
    private final String apiKey;
    private final String provider;
    private final String defaultModel;
    private final String defaultVoice;
    private final String coquiSpeakerId;
    private final String coquiLanguageId;
    private final String responseFormat;
    private final int maxCharsPerChunk;
    private final int maxTotalChars;

    public StudyMaterialAudioService(
            @Value("${app.audiobook.tts.api-url}") String ttsApiUrl,
            @Value("${app.audiobook.tts.api-key:}") String apiKey,
            @Value("${app.audiobook.tts.provider:openai}") String provider,
            @Value("${app.audiobook.tts.model}") String defaultModel,
            @Value("${app.audiobook.tts.voice}") String defaultVoice,
            @Value("${app.audiobook.tts.coqui-speaker-id:}") String coquiSpeakerId,
            @Value("${app.audiobook.tts.coqui-language-id:}") String coquiLanguageId,
            @Value("${app.audiobook.tts.response-format:mp3}") String responseFormat,
            @Value("${app.audiobook.tts.max-chars-per-chunk:3500}") int maxCharsPerChunk,
            @Value("${app.audiobook.tts.max-total-chars:50000}") int maxTotalChars) {
        this.tika = new Tika();
        this.objectMapper = new ObjectMapper();
        this.restTemplate = new RestTemplate();
        this.ttsApiUrl = ttsApiUrl;
        this.apiKey = apiKey;
        this.provider = provider;
        this.defaultModel = defaultModel;
        this.defaultVoice = defaultVoice;
        this.coquiSpeakerId = coquiSpeakerId;
        this.coquiLanguageId = coquiLanguageId;
        this.responseFormat = responseFormat;
        this.maxCharsPerChunk = maxCharsPerChunk;
        this.maxTotalChars = maxTotalChars;
    }

    public AudioBookResult convertToAudiobook(MultipartFile file, String voiceOverride) {
        validateFile(file);

        if (usesOpenAiProvider() && (apiKey == null || apiKey.isBlank())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "APP_AUDIOBOOK_TTS_API_KEY is not configured on server");
        }

        String text = extractText(file);
        if (text.isBlank()) {
            throw new IllegalArgumentException("Could not extract readable text from the uploaded file");
        }

        if (text.length() > maxTotalChars) {
            throw new IllegalArgumentException("Document is too large for conversion. Max supported text length is "
                    + maxTotalChars + " characters");
        }

        if (usesPiperProvider()) {
            String voice = hasText(voiceOverride) ? voiceOverride.trim() : null;
            byte[] audioBytes = synthesizePiper(text, voice);
            String outputName = outputName(file.getOriginalFilename(), "wav");
            return new AudioBookResult(outputName, audioBytes, "audio/wav", text.length(), 1);
        }

        if (usesCoquiProvider()) {
            byte[] audioBytes = synthesizeCoqui(text);
            String outputName = outputName(file.getOriginalFilename(), "wav");
            return new AudioBookResult(outputName, audioBytes, "audio/wav", text.length(), 1);
        }

        List<String> chunks = splitIntoChunks(text, maxCharsPerChunk);
        ByteArrayOutputStream combinedAudio = new ByteArrayOutputStream();

        String effectiveVoice = hasText(voiceOverride) ? voiceOverride.trim() : defaultVoice;
        for (int i = 0; i < chunks.size(); i++) {
            byte[] chunkAudio = synthesizeOpenAiChunk(chunks.get(i), effectiveVoice);
            try {
                combinedAudio.write(chunkAudio);
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to combine generated audiobook chunks", ex);
            }
            LOGGER.info("Generated audiobook chunk {}/{}", i + 1, chunks.size());
        }

        String extension = hasText(responseFormat) ? responseFormat.toLowerCase(Locale.ROOT) : "mp3";
        String contentType = switch (extension) {
            case "wav" -> "audio/wav";
            case "opus" -> "audio/ogg";
            default -> "audio/mpeg";
        };
        String outputName = outputName(file.getOriginalFilename(), extension);
        return new AudioBookResult(outputName, combinedAudio.toByteArray(), contentType, text.length(), chunks.size());
    }

    private byte[] synthesizeOpenAiChunk(String textChunk, String voice) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", defaultModel);
        payload.put("voice", voice);
        payload.put("input", textChunk);
        payload.put("response_format", responseFormat);

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
        } catch (HttpStatusCodeException ex) {
            String providerMessage = ex.getResponseBodyAsString();
            if (providerMessage != null && providerMessage.length() > 400) {
                providerMessage = providerMessage.substring(0, 400);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "TTS provider request failed: " + ex.getStatusCode().value() + " " + providerMessage, ex);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate audiobook using configured TTS API", ex);
        }
    }

    private byte[] synthesizeCoqui(String text) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("text", text);
        if (hasText(coquiSpeakerId)) {
            payload.put("speaker_id", coquiSpeakerId.trim());
        }
        if (hasText(coquiLanguageId)) {
            payload.put("language_id", coquiLanguageId.trim());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.parseMediaType("audio/wav"), MediaType.APPLICATION_OCTET_STREAM));
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(ttsApiUrl, HttpMethod.POST, request, byte[].class);
            if (response.getBody() == null || response.getBody().length == 0) {
                throw new IllegalStateException("Coqui TTS returned empty audio response");
            }
            return response.getBody();
        } catch (HttpStatusCodeException ex) {
            String providerMessage = ex.getResponseBodyAsString();
            if (providerMessage != null && providerMessage.length() > 400) {
                providerMessage = providerMessage.substring(0, 400);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Coqui TTS request failed: " + ex.getStatusCode().value() + " " + providerMessage, ex);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate audiobook using Coqui TTS", ex);
        }
    }

    private byte[] synthesizePiper(String text, String voiceOverride) {
        URI piperUri = parsePiperUri(ttsApiUrl);
        int sampleRate = 22050;
        int sampleWidth = 2;
        int channels = 1;
        ByteArrayOutputStream pcmBuffer = new ByteArrayOutputStream();

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(piperUri.getHost(), piperUri.getPort()), 5000);
            socket.setSoTimeout(120000);

            try (OutputStream output = socket.getOutputStream(); InputStream input = socket.getInputStream()) {
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("text", text);
                if (isLikelyPiperVoice(voiceOverride)) {
                    eventData.put("voice", Map.of("name", voiceOverride));
                }

                Map<String, Object> event = Map.of("type", "synthesize", "data", eventData);
                output.write(objectMapper.writeValueAsBytes(event));
                output.write('\n');
                output.flush();

                while (true) {
                    byte[] headerBytes = readLineBytes(input);
                    if (headerBytes == null) {
                        throw new IllegalStateException("Piper connection closed before audio was fully received");
                    }

                    Map<String, Object> header = objectMapper.readValue(headerBytes,
                            new TypeReference<Map<String, Object>>() {
                            });

                    int dataLength = toInt(header.get("data_length"), 0);
                    int payloadLength = toInt(header.get("payload_length"), 0);
                    byte[] dataBytes = readExactBytes(input, dataLength);
                    byte[] payloadBytes = readExactBytes(input, payloadLength);

                    String type = String.valueOf(header.getOrDefault("type", ""));
                    Map<String, Object> data = mergeEventData(header.get("data"), dataBytes);

                    if ("audio-start".equals(type)) {
                        sampleRate = toInt(data.get("rate"), sampleRate);
                        sampleWidth = toInt(data.get("width"), sampleWidth);
                        channels = toInt(data.get("channels"), channels);
                    } else if ("audio-chunk".equals(type)) {
                        if (payloadBytes.length > 0) {
                            pcmBuffer.write(payloadBytes);
                        }
                    } else if ("audio-stop".equals(type)) {
                        if (pcmBuffer.size() == 0) {
                            throw new IllegalStateException("Piper returned no audio data");
                        }
                        return buildWav(pcmBuffer.toByteArray(), sampleRate, sampleWidth, channels);
                    } else if ("error".equals(type)) {
                        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                                "Piper TTS error: " + data.getOrDefault("message", "unknown error"));
                    }
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to generate audiobook using Piper TTS", ex);
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

    private String outputName(String originalFileName, String extension) {
        String base = originalFileName == null ? "study-material" : originalFileName;
        int dot = base.lastIndexOf('.');
        if (dot > 0) {
            base = base.substring(0, dot);
        }
        return base + "." + extension;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean usesOpenAiProvider() {
        return !usesCoquiProvider() && !usesPiperProvider();
    }

    private boolean usesCoquiProvider() {
        return hasText(provider) && "coqui".equalsIgnoreCase(provider.trim());
    }

    private boolean usesPiperProvider() {
        return hasText(provider) && "piper".equalsIgnoreCase(provider.trim());
    }

    private boolean isLikelyPiperVoice(String value) {
        if (!hasText(value)) {
            return false;
        }

        String candidate = value.trim();
        // Ignore OpenAI-style voices (alloy/nova/echo/...) when Piper is configured.
        if (!candidate.contains("_") || !candidate.contains("-")) {
            return false;
        }

        return candidate.matches("^[A-Za-z]{2}_[A-Za-z]{2}[-_].+");
    }

    private URI parsePiperUri(String value) {
        String normalized = value == null ? "" : value.trim();
        if (!normalized.contains("://")) {
            normalized = "tcp://" + normalized;
        }

        URI uri = URI.create(normalized);
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new IllegalStateException("Invalid Piper endpoint. Set APP_AUDIOBOOK_TTS_API_URL like tcp://tts:10200");
        }

        int port = uri.getPort();
        if (port <= 0) {
            throw new IllegalStateException("Invalid Piper endpoint port. Set APP_AUDIOBOOK_TTS_API_URL like tcp://tts:10200");
        }

        return uri;
    }

    private byte[] readLineBytes(InputStream input) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        int value;
        while ((value = input.read()) != -1) {
            if (value == '\n') {
                break;
            }
            if (value != '\r') {
                line.write(value);
            }
        }

        if (value == -1 && line.size() == 0) {
            return null;
        }

        return line.toByteArray();
    }

    private byte[] readExactBytes(InputStream input, int length) throws IOException {
        if (length <= 0) {
            return new byte[0];
        }

        byte[] result = new byte[length];
        int offset = 0;
        while (offset < length) {
            int read = input.read(result, offset, length - offset);
            if (read == -1) {
                throw new IOException("Unexpected end of stream while reading Piper response");
            }
            offset += read;
        }
        return result;
    }

    private Map<String, Object> mergeEventData(Object headerData, byte[] dataBytes) throws IOException {
        Map<String, Object> merged = new HashMap<>();
        if (headerData instanceof Map<?, ?> mapData) {
            for (Map.Entry<?, ?> entry : mapData.entrySet()) {
                if (entry.getKey() != null) {
                    merged.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
        }

        if (dataBytes.length > 0) {
            String text = new String(dataBytes, StandardCharsets.UTF_8).trim();
            if (!text.isEmpty()) {
                Map<String, Object> additionalData = objectMapper.readValue(text,
                        new TypeReference<Map<String, Object>>() {
                        });
                merged.putAll(additionalData);
            }
        }

        return merged;
    }

    private int toInt(Object value, int fallback) {
        if (value instanceof Number numberValue) {
            return numberValue.intValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Integer.parseInt(stringValue.trim());
            } catch (NumberFormatException ex) {
                return fallback;
            }
        }
        return fallback;
    }

    private byte[] buildWav(byte[] pcmData, int sampleRate, int sampleWidth, int channels) {
        int bitsPerSample = sampleWidth * 8;
        int byteRate = sampleRate * channels * sampleWidth;
        int blockAlign = channels * sampleWidth;
        int dataSize = pcmData.length;
        int riffChunkSize = 36 + dataSize;

        ByteArrayOutputStream wav = new ByteArrayOutputStream(44 + dataSize);
        try {
            wav.write("RIFF".getBytes(StandardCharsets.US_ASCII));
            writeIntLe(wav, riffChunkSize);
            wav.write("WAVE".getBytes(StandardCharsets.US_ASCII));
            wav.write("fmt ".getBytes(StandardCharsets.US_ASCII));
            writeIntLe(wav, 16);
            writeShortLe(wav, 1);
            writeShortLe(wav, channels);
            writeIntLe(wav, sampleRate);
            writeIntLe(wav, byteRate);
            writeShortLe(wav, blockAlign);
            writeShortLe(wav, bitsPerSample);
            wav.write("data".getBytes(StandardCharsets.US_ASCII));
            writeIntLe(wav, dataSize);
            wav.write(pcmData);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to build WAV output", ex);
        }

        return wav.toByteArray();
    }

    private void writeIntLe(ByteArrayOutputStream output, int value) {
        output.write(value & 0xff);
        output.write((value >> 8) & 0xff);
        output.write((value >> 16) & 0xff);
        output.write((value >> 24) & 0xff);
    }

    private void writeShortLe(ByteArrayOutputStream output, int value) {
        output.write(value & 0xff);
        output.write((value >> 8) & 0xff);
    }

    private String normalizeWhitespace(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('\u0000', ' ').replaceAll("\\s+", " ").trim();
    }

    public record AudioBookResult(String fileName, byte[] audioBytes, String contentType, int sourceCharCount,
            int chunkCount) {
    }
}
