package com.example.rag.service;

import com.example.rag.dto.DocumentUploadResponse;
import com.example.rag.model.Document;
import com.example.rag.model.DocumentChunk;
import com.example.rag.model.User;
import com.example.rag.repository.DocumentChunkRepository;
import com.example.rag.repository.DocumentRepository;
import com.example.rag.util.ChunkingUtil;
import com.pgvector.PGvector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.tika.Tika;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIngestionService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;
    private final ChunkingUtil chunkingUtil;

    private static final String UPLOAD_DIR = "uploads/";
    private final Tika tika = new Tika();

    /**
     * Process and ingest a document file
     * 
     * @param file The uploaded file
     * @param user The user uploading the document
     * @return Upload response with document details
     */
    public DocumentUploadResponse ingestDocument(MultipartFile file, User user) throws IOException {
        log.info("Starting document ingestion for file: {}", file.getOriginalFilename());

        try {
            // Save file to disk
            String filename = file.getOriginalFilename();
            String savedPath = saveFile(file);

            // Detect file type
            String fileType = detectFileType(filename);

            // Extract text content
            String content = extractText(savedPath, fileType);

            // Create document entity
            Document document = Document.builder()
                    .filename(filename)
                    .filePath(savedPath)
                    .fileType(fileType)
                    .fileSize(file.getSize())
                    .content(content)
                    .user(user)
                    .processed(false)
                    .build();

            document = documentRepository.save(document);
            log.info("Document saved with ID: {}", document.getId());

            // Process chunks (in separate transaction)
            int chunkCount = 0;
            try {
                chunkCount = processDocumentChunks(document);
            } catch (Exception e) {
                log.warn("Failed to process chunks for document {}: {}", document.getId(), e.getMessage(), e);
                // Document is still saved, but chunks failed to process
                return DocumentUploadResponse.builder()
                        .success(false)
                        .documentId(document.getId())
                        .filename(filename)
                        .fileType(fileType)
                        .fileSize(file.getSize())
                        .chunksCreated(0)
                        .processed(false)
                        .message("Document uploaded but embedding processing failed: " + e.getMessage())
                        .build();
            }

            return DocumentUploadResponse.builder()
                    .success(true)
                    .documentId(document.getId())
                    .filename(filename)
                    .fileType(fileType)
                    .fileSize(file.getSize())
                    .chunksCreated(chunkCount)
                    .processed(true)
                    .message("Document uploaded and processed successfully")
                    .build();
        } catch (Exception e) {
            log.error("Error during document ingestion: {}", e.getMessage(), e);
            return DocumentUploadResponse.builder()
                    .success(false)
                    .message("Error processing document: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Ingest content from a web URL
     * 
     * @param url  The web URL
     * @param user The user
     * @return Upload response with document details
     */
    public DocumentUploadResponse ingestFromUrl(String url, User user) throws IOException {
        return ingestWebUrl(url, user);
    }

    /**
     * Ingest content from a web URL
     * 
     * @param url  The web URL
     * @param user The user
     * @return Upload response with document details
     */
    public DocumentUploadResponse ingestWebUrl(String url, User user) throws IOException {
        log.info("Starting web URL ingestion: {}", url);

        try {
            // Validate URL
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                throw new IOException("Invalid URL format. Must start with http:// or https://");
            }

            // Fetch and parse web content
            String content = fetchWebContent(url);

            if (content == null || content.trim().isEmpty()) {
                throw new IOException("No content could be extracted from the URL");
            }

            log.info("Successfully fetched {} characters from URL", content.length());

            // Create document entity
            Document document = Document.builder()
                    .filename(extractTitleFromUrl(url))
                    .filePath(url)
                    .fileType("WEB_URL")
                    .sourceUrl(url)
                    .fileSize((long) content.length())
                    .content(content)
                    .user(user)
                    .processed(false)
                    .build();

            document = documentRepository.save(document);
            log.info("Web document saved with ID: {}", document.getId());

            // Process chunks (in separate transaction)
            int chunkCount = 0;
            try {
                chunkCount = processDocumentChunks(document);
            } catch (Exception e) {
                log.warn("Failed to process chunks for document {}: {}", document.getId(), e.getMessage(), e);
                // Document is still saved, but chunks failed to process
                return DocumentUploadResponse.builder()
                        .success(false)
                        .documentId(document.getId())
                        .filename(document.getFilename())
                        .fileType("WEB_URL")
                        .fileSize((long) content.length())
                        .chunksCreated(0)
                        .processed(false)
                        .message("Document uploaded but embedding processing failed: " + e.getMessage())
                        .build();
            }

            return DocumentUploadResponse.builder()
                    .success(true)
                    .documentId(document.getId())
                    .filename(document.getFilename())
                    .fileType("WEB_URL")
                    .fileSize((long) content.length())
                    .chunksCreated(chunkCount)
                    .processed(true)
                    .message("Web content fetched and processed successfully")
                    .build();
        } catch (Exception e) {
            log.error("Error during web URL ingestion: {}", e.getMessage(), e);
            return DocumentUploadResponse.builder()
                    .success(false)
                    .message("Error processing URL: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Process document into chunks with embeddings
     * 
     * @param document The document to process
     * @return Number of chunks created
     */
    @Transactional
    public int processDocumentChunks(Document document) {
        log.info("Processing chunks for document ID: {}", document.getId());

        String content = chunkingUtil.cleanText(document.getContent());
        List<String> chunks = chunkingUtil.chunkText(content);

        // Log total chunks created IMMEDIATELY
        log.info("🚀 Total chunks created: {}", chunks.size());

        List<DocumentChunk> documentChunks = new ArrayList<>();

        for (int i = 0; i < chunks.size(); i++) {
            String chunkText = chunks.get(i);

            // Generate embedding
            float[] embedding = embeddingService.generateEmbedding(chunkText);

            // Create chunk entity
            DocumentChunk chunk = DocumentChunk.builder()
                    .document(document)
                    .chunkIndex(i)
                    .content(chunkText)
                    .tokenCount(chunkingUtil.estimateTokenCount(chunkText))
                    .embedding(new PGvector(embedding))
                    .embeddingModel(embeddingService.getCurrentProvider())
                    .build();

            documentChunks.add(chunk);

            log.debug("Created chunk {} for document {}", i, document.getId());
        }

        chunkRepository.saveAll(documentChunks);

        // Update document status
        document.setProcessed(true);
        documentRepository.save(document);

        log.info("Successfully processed {} chunks for document ID: {}",
                chunks.size(), document.getId());

        return chunks.size();
    }

    /**
     * Extract text from file based on type
     * 
     * @param filePath Path to the file
     * @param fileType Type of file
     * @return Extracted text content
     */
    private String extractText(String filePath, String fileType) throws IOException {
        try {
            return switch (fileType) {
                case "PDF" -> extractPdfText(filePath);
                case "DOCX" -> extractDocxText(filePath);
                case "TXT", "MARKDOWN" -> extractPlainText(filePath);
                default -> {
                    log.warn("Unknown file type {}, trying Tika", fileType);
                    yield tika.parseToString(new File(filePath));
                }
            };
        } catch (org.apache.tika.exception.TikaException e) {
            log.error("Error during Tika parsing: {}", e.getMessage(), e);
            throw new IOException("Failed to parse file with Tika", e);
        }
    }

    /**
     * Extract text from PDF - tries PDFBox first, then falls back to Tika if empty
     */
    private String extractPdfText(String filePath) throws IOException {
        String text = "";

        // Try PDFBox first (fast, good for text-based PDFs)
        try (FileInputStream fis = new FileInputStream(filePath);
                PDDocument document = Loader.loadPDF(fis.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            text = stripper.getText(document);
            log.info("PDFBox extraction: {} characters extracted", text.length());

            if (!text.trim().isEmpty()) {
                return text;
            }
            log.warn("PDFBox returned empty text for {}. Trying Tika...", filePath);
        } catch (Exception e) {
            log.warn("PDFBox extraction failed: {}. Trying Tika...", e.getMessage());
        }

        // Fallback to Tika for image-based or complex PDFs
        try {
            text = tika.parseToString(new File(filePath));
            log.info("Tika extraction: {} characters extracted", text.length());

            if (text.trim().isEmpty()) {
                log.error("Both PDFBox and Tika returned empty text. PDF may be scanned without OCR.");
                throw new IOException("PDF appears to be image-based without extractable text. OCR not available.");
            }
            return text;
        } catch (org.apache.tika.exception.TikaException e) {
            log.error("Tika extraction also failed: {}", e.getMessage());
            throw new IOException("Failed to extract text from PDF with both PDFBox and Tika", e);
        }
    }

    /**
     * Extract text from DOCX
     */
    private String extractDocxText(String filePath) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
                XWPFDocument document = new XWPFDocument(fis);
                XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    /**
     * Extract plain text
     */
    private String extractPlainText(String filePath) throws IOException {
        return Files.readString(Paths.get(filePath));
    }

    /**
     * Fetch content from web URL with multiple extraction strategies
     */
    private String fetchWebContent(String url) throws IOException {
        log.info("Fetching content from URL: {}", url);

        org.jsoup.nodes.Document doc;
        try {
            doc = Jsoup.connect(url)
                    .userAgent(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(20000)
                    .followRedirects(true)
                    .ignoreHttpErrors(false)
                    .ignoreContentType(false)
                    .get();
        } catch (IOException e) {
            log.error("Failed to fetch URL: {}", e.getMessage());
            throw new IOException("Failed to connect to URL: " + e.getMessage(), e);
        }

        // Remove unwanted elements
        doc.select("script, style, noscript, meta, iframe, .navigation, .nav, .sidebar, .related, .comments, .ads")
                .remove();
        doc.select("nav, footer, header, aside").remove();

        // Strategy 1: Extract from common content selectors
        String content = extractMainContent(doc);
        log.info("Strategy 1 (main content) extracted: {} characters", content.length());

        // Strategy 2: Get all paragraphs
        if (content.length() < 200) {
            content = doc.select("p, h1, h2, h3, h4, h5, h6, li, td")
                    .stream()
                    .map(e -> e.text())
                    .filter(text -> !text.trim().isEmpty())
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
            log.info("Strategy 2 (paragraphs) extracted: {} characters", content.length());
        }

        // Strategy 3: Get all divs with significant content
        if (content.length() < 200) {
            content = doc.select("div")
                    .stream()
                    .map(e -> e.text())
                    .filter(text -> text.length() > 50) // Only divs with substantial content
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
            log.info("Strategy 3 (divs) extracted: {} characters", content.length());
        }

        // Strategy 4: Get everything from body as last resort
        if (content.length() < 200) {
            content = doc.body().text();
            log.info("Strategy 4 (full body) extracted: {} characters", content.length());
        }

        // Clean up extra whitespace and normalize
        content = content.replaceAll("\\s+", " ")
                .replaceAll("\\s+([.,!?;:])", "$1") // Fix spacing before punctuation
                .trim();

        log.info("Final extracted content: {} characters", content.length());
        log.debug("Content preview: {}", content.length() > 100 ? content.substring(0, 100) + "..." : content);

        if (content.length() < 30) {
            throw new IOException(
                    "Insufficient content extracted from URL. Only got " + content.length() + " characters. " +
                            "The page may be JavaScript-rendered or contain minimal text content.");
        }

        return content;
    }

    /**
     * Intelligently extract main content from HTML document with fallbacks
     */
    private String extractMainContent(org.jsoup.nodes.Document doc) {
        // Priority 1: Look for semantic content elements
        String[] semanticSelectors = {
                "article > p",
                "main > p",
                "[role='main'] > p",
                ".content > p",
                ".main-content > p",
                "#content > p",
                ".post-content > p",
                ".entry-content > p"
        };

        for (String selector : semanticSelectors) {
            String text = doc.select(selector).stream()
                    .map(e -> e.text())
                    .filter(t -> !t.trim().isEmpty())
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
            if (text.length() > 150) {
                log.debug("Extracted content using semantic selector: {}", selector);
                return text;
            }
        }

        // Priority 2: Look for container elements
        String[] containerSelectors = {
                "article",
                "main",
                "[role='main']",
                ".content",
                ".main-content",
                "#content",
                "#main-content",
                ".post-content",
                ".entry-content",
                ".article-body"
        };

        for (String selector : containerSelectors) {
            org.jsoup.select.Elements elements = doc.select(selector);
            if (!elements.isEmpty()) {
                String text = elements.text();
                if (text.length() > 150) {
                    log.debug("Extracted content using container selector: {}", selector);
                    return text;
                }
            }
        }

        // Priority 3: Get the largest text block
        String largestBlock = doc.select("div, section, article")
                .stream()
                .map(e -> e.text())
                .filter(text -> text.length() > 200)
                .reduce((a, b) -> a.length() > b.length() ? a : b)
                .orElse("");

        if (largestBlock.length() > 150) {
            log.debug("Extracted content using largest block");
            return largestBlock;
        }

        // If no main content found, return empty (strategies will use fallback)
        return "";
    }

    /**
     * Save uploaded file to disk
     */
    private String saveFile(MultipartFile file) throws IOException {
        // Create upload directory if not exists
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String uniqueFilename = UUID.randomUUID() + extension;

        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return filePath.toString();
    }

    /**
     * Detect file type from filename
     */
    private String detectFileType(String filename) {
        if (filename == null)
            return "UNKNOWN";

        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf"))
            return "PDF";
        if (lower.endsWith(".docx"))
            return "DOCX";
        if (lower.endsWith(".txt"))
            return "TXT";
        if (lower.endsWith(".md") || lower.endsWith(".markdown"))
            return "MARKDOWN";

        return "UNKNOWN";
    }

    /**
     * Extract title from URL
     */
    private String extractTitleFromUrl(String url) {
        try {
            String title = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(10000)
                    .get()
                    .title();

            if (title != null && !title.trim().isEmpty()) {
                // Limit title length
                return title.length() > 100 ? title.substring(0, 100) + "..." : title;
            }
        } catch (IOException e) {
            log.debug("Could not fetch title from URL, using fallback: {}", e.getMessage());
        }

        // Fallback: extract domain or path
        try {
            java.net.URL urlObj = new java.net.URL(url);
            String host = urlObj.getHost();
            String path = urlObj.getPath();

            if (path != null && path.length() > 1) {
                String lastSegment = path.substring(path.lastIndexOf('/') + 1);
                if (!lastSegment.isEmpty()) {
                    return lastSegment.replaceAll("[^a-zA-Z0-9-_.]", "_");
                }
            }

            return host.replaceAll("^www\\.", "");
        } catch (Exception e) {
            // Final fallback
            return "web-content-" + System.currentTimeMillis();
        }
    }

    /**
     * Get all documents for a user
     * 
     * @param userId The user ID
     * @return List of user's documents
     */
    public List<Document> getUserDocuments(Long userId) {
        log.info("Fetching documents for user ID: {}", userId);
        return documentRepository.findByUserId(userId);
    }

    /**
     * Get document by ID
     * 
     * @param documentId The document ID
     * @return The document or null if not found
     */
    public Document getDocumentById(Long documentId) {
        return documentRepository.findById(documentId).orElse(null);
    }

    /**
     * Get chunk count for a document without initializing lazy collections.
     *
     * @param documentId The document ID
     * @return Number of chunks for the document
     */
    public long getChunkCount(Long documentId) {
        Long count = chunkRepository.countByDocumentId(documentId);
        return count != null ? count : 0L;
    }

    /**
     * Delete document and its chunks
     * 
     * @param documentId The document ID to delete
     */
    @Transactional
    public void deleteDocument(Long documentId) {
        log.info("Deleting document with ID: {}", documentId);

        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isPresent()) {
            // Delete all chunks first (due to cascade, this is handled automatically)
            chunkRepository.deleteByDocumentId(documentId);

            // Delete document
            documentRepository.deleteById(documentId);

            log.info("Document deleted with ID: {}", documentId);
        }
    }
}
