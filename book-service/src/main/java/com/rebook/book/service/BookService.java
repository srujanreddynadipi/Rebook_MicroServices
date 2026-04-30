package com.rebook.book.service;

import com.rebook.book.dto.response.UserStatsResponse;

import com.rebook.book.dto.request.BookSearchRequest;
import com.rebook.book.dto.request.CreateBookRequest;
import com.rebook.book.dto.request.UpdateBookRequest;
import com.rebook.book.dto.response.BookImageResponse;
import com.rebook.book.dto.response.BookResponse;
import com.rebook.book.entity.Book;
import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookImage;
import com.rebook.book.entity.BookStatus;
import com.rebook.book.mapper.BookMapper;
import com.rebook.book.repository.BookRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional
public class BookService {

    private static final String BOOK_EVENTS_TOPIC = "book-events";
    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    private final BookRepository bookRepository;
    private final BookMapper bookMapper;
    private final S3Service s3Service;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public BookService(BookRepository bookRepository,
            BookMapper bookMapper,
            S3Service s3Service,
            RedisTemplate<String, Object> redisTemplate,
            KafkaTemplate<String, Object> kafkaTemplate) {
        this.bookRepository = bookRepository;
        this.bookMapper = bookMapper;
        this.s3Service = s3Service;
        this.redisTemplate = redisTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public BookResponse createBook(CreateBookRequest request, List<MultipartFile> images, Long ownerId) {
        if (!request.isAtLeastOneModeEnabled()) {
            throw new IllegalArgumentException("At least one of donation or lending must be true");
        }

        Book book = Book.builder()
                .title(request.getTitle())
                .author(request.getAuthor())
                .publisher(request.getPublisher())
                .isbn(request.getIsbn())
                .keywords(request.getKeywords())
                .category(request.getCategory())
                .condition(request.getCondition())
                .city(request.getCity())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .isDonation(request.isDonation())
                .isLending(request.isLending())
                .status(BookStatus.AVAILABLE)
                .ownerId(ownerId)
                .build();

        Book saved = bookRepository.save(book);
        saveImages(saved, images);
        Book updated = bookRepository.save(saved);

        publishBookEvent("BOOK_ADDED", updated.getId(), ownerId);

        return mapResponseWithOrderedImages(updated, null);
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public BookResponse updateBook(Long bookId,
            UpdateBookRequest request,
            List<MultipartFile> newImages,
            Long requesterId) {
        Book book = bookRepository.findWithImagesById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        if (!Objects.equals(book.getOwnerId(), requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owner can update this book");
        }

        bookMapper.updateBookFromRequest(request, book);

        if (request.getIsDonation() != null || request.getIsLending() != null) {
            if (!book.isDonation() && !book.isLending()) {
                throw new IllegalArgumentException("At least one of donation or lending must be true");
            }
        }

        if (newImages != null && !newImages.isEmpty()) {
            deleteAllBookImages(book);
            book.getImages().clear();
            saveImages(book, newImages);
        }

        Book updated = bookRepository.save(book);

        return mapResponseWithOrderedImages(updated, null);
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public void deleteBook(Long bookId, Long requesterId, String requesterRole) {
        Book book = bookRepository.findWithImagesById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        boolean isOwner = Objects.equals(book.getOwnerId(), requesterId);
        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(requesterRole);
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this book");
        }

        deleteAllBookImages(book);
        bookRepository.delete(book);

        publishBookEvent("BOOK_DELETED", bookId, null);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "books:byId", key = "#bookId")
    public BookResponse getBookById(Long bookId) {
        Book book = bookRepository.findWithImagesById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));
        return mapResponseWithOrderedImages(book, null);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "books:popular", key = "'top10'")
    public List<BookResponse> getPopularBooks() {
        Set<Object> topIds = redisTemplate.opsForZSet().reverseRange("books:popularity", 0, 9);
        if (topIds != null && !topIds.isEmpty()) {
            List<Long> bookIds = topIds.stream()
                    .map(id -> Long.parseLong(id.toString()))
                    .collect(Collectors.toList());
            List<Book> books = bookRepository.findAllById(bookIds);
            Map<Long, Book> booksById = books.stream()
                    .collect(Collectors.toMap(Book::getId, b -> b));
            return bookIds.stream()
                    .filter(booksById::containsKey)
                    .map(id -> mapResponseWithOrderedImages(booksById.get(id), null))
                    .collect(Collectors.toList());
        }
        List<Book> fallback = bookRepository.findTop10ByStatusOrderByRequestCountDesc(BookStatus.AVAILABLE);
        List<BookResponse> responses = new ArrayList<>();
        for (Book book : fallback) {
            responses.add(mapResponseWithOrderedImages(book, null));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> searchBooks(BookSearchRequest searchRequest) {
        Pageable pageable = PageRequest.of(
                Math.max(searchRequest.getPage(), 0),
                Math.max(searchRequest.getSize(), 1),
                Sort.by("asc".equalsIgnoreCase(searchRequest.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC,
                        searchRequest.getSortBy()));

        boolean hasGeo = searchRequest.getUserLatitude() != null
                && searchRequest.getUserLongitude() != null
                && searchRequest.getRadiusKm() != null;

        if (hasGeo) {
            return searchBooksWithGeo(searchRequest, pageable);
        }

        Specification<Book> spec = buildSpecification(searchRequest);
        Page<Book> booksPage = bookRepository.findAll(spec, pageable);

        return booksPage.map(book -> mapResponseWithOrderedImages(book, null));
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getBooksByOwner(Long ownerId, Pageable pageable) {
        Page<Book> page = bookRepository.findByOwnerId(ownerId, pageable);
        return page.map(book -> mapResponseWithOrderedImages(book, null));
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getBooksByCategory(BookCategory category, Pageable pageable) {
        Page<Book> page = bookRepository.findByCategoryAndStatus(category, BookStatus.AVAILABLE, pageable);
        List<BookResponse> responses = new ArrayList<>();
        for (Book book : page.getContent()) {
            responses.add(mapResponseWithOrderedImages(book, null));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getRecommendedBooks(Long bookId, int limit) {
        Book baseBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        Pageable pageable = PageRequest.of(0, Math.max(limit, 1),
                Sort.by(Sort.Direction.DESC, "requestCount", "createdAt"));

        Page<Book> page = bookRepository.findRecommendations(
                bookId,
                baseBook.getCategory(),
                baseBook.getAuthor(),
                BookStatus.AVAILABLE,
                pageable);

        List<BookResponse> responses = new ArrayList<>();
        for (Book book : page.getContent()) {
            responses.add(mapResponseWithOrderedImages(book, null));
        }
        return responses;
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public void updateBookStatus(Long bookId, BookStatus newStatus) {
        int updated = bookRepository.updateStatus(bookId, newStatus);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found");
        }
    }

    public void incrementBookPopularity(Long bookId) {
        redisTemplate.opsForZSet().incrementScore("books:popularity", bookId.toString(), 1.0);
    }

    private Specification<Book> buildSpecification(BookSearchRequest searchRequest) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("status"), BookStatus.AVAILABLE));

            if (hasText(searchRequest.getKeyword())) {
                String like = "%" + searchRequest.getKeyword().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("author")), like),
                        cb.like(cb.lower(root.get("keywords")), like)));
            }

            if (hasText(searchRequest.getAuthor())) {
                predicates.add(cb.like(cb.lower(root.get("author")),
                        "%" + searchRequest.getAuthor().toLowerCase() + "%"));
            }

            if (hasText(searchRequest.getPublisher())) {
                predicates.add(cb.like(cb.lower(root.get("publisher")),
                        "%" + searchRequest.getPublisher().toLowerCase() + "%"));
            }

            if (hasText(searchRequest.getIsbn())) {
                predicates.add(cb.equal(root.get("isbn"), searchRequest.getIsbn()));
            }

            if (hasText(searchRequest.getCity())) {
                predicates.add(cb.like(cb.lower(root.get("city")),
                        "%" + searchRequest.getCity().toLowerCase() + "%"));
            }

            if (searchRequest.getCategory() != null) {
                predicates.add(cb.equal(root.get("category"), searchRequest.getCategory()));
            }

            if (searchRequest.getCondition() != null) {
                predicates.add(cb.equal(root.get("condition"), searchRequest.getCondition()));
            }

            if (Boolean.TRUE.equals(searchRequest.getIsDonation())) {
                predicates.add(cb.isTrue(root.get("isDonation")));
            }

            if (Boolean.TRUE.equals(searchRequest.getIsLending())) {
                predicates.add(cb.isTrue(root.get("isLending")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Page<BookResponse> searchBooksWithGeo(BookSearchRequest searchRequest, Pageable pageable) {
        List<Object[]> rows = bookRepository.findAvailableBooksWithinRadius(
                searchRequest.getUserLatitude(),
                searchRequest.getUserLongitude(),
                searchRequest.getRadiusKm());

        Map<Long, Double> distanceByBookId = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length == 0 || row[0] == null) {
                continue;
            }
            Long id = ((Number) row[0]).longValue();
            Object distanceObj = row[row.length - 1];
            Double distance = distanceObj instanceof Number ? ((Number) distanceObj).doubleValue() : null;
            distanceByBookId.put(id, distance);
        }

        if (distanceByBookId.isEmpty()) {
            return Page.empty(pageable);
        }

        Map<Long, Book> booksById = new HashMap<>();
        for (Book book : bookRepository.findAllById(distanceByBookId.keySet())) {
            booksById.put(book.getId(), book);
        }

        List<Book> orderedFilteredBooks = distanceByBookId.keySet().stream()
                .map(booksById::get)
                .filter(Objects::nonNull)
                .filter(book -> matchesSearchFilters(book, searchRequest))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), orderedFilteredBooks.size());
        if (start >= orderedFilteredBooks.size()) {
            return new PageImpl<>(List.of(), pageable, orderedFilteredBooks.size());
        }

        List<BookResponse> content = new ArrayList<>();
        for (Book book : orderedFilteredBooks.subList(start, end)) {
            content.add(mapResponseWithOrderedImages(book, distanceByBookId.get(book.getId())));
        }

        return new PageImpl<>(content, pageable, orderedFilteredBooks.size());
    }

    private boolean matchesSearchFilters(Book book, BookSearchRequest req) {
        if (req.getCategory() != null && req.getCategory() != book.getCategory()) {
            return false;
        }
        if (req.getCondition() != null && req.getCondition() != book.getCondition()) {
            return false;
        }
        if (Boolean.TRUE.equals(req.getIsDonation()) && !book.isDonation()) {
            return false;
        }
        if (Boolean.TRUE.equals(req.getIsLending()) && !book.isLending()) {
            return false;
        }
        if (hasText(req.getKeyword())) {
            String keyword = req.getKeyword().toLowerCase();
            boolean keywordMatch = containsIgnoreCase(book.getTitle(), keyword)
                    || containsIgnoreCase(book.getAuthor(), keyword)
                    || containsIgnoreCase(book.getKeywords(), keyword);
            if (!keywordMatch) {
                return false;
            }
        }
        if (hasText(req.getAuthor()) && !containsIgnoreCase(book.getAuthor(), req.getAuthor().toLowerCase())) {
            return false;
        }
        if (hasText(req.getPublisher()) && !containsIgnoreCase(book.getPublisher(), req.getPublisher().toLowerCase())) {
            return false;
        }
        if (hasText(req.getIsbn()) && !Objects.equals(book.getIsbn(), req.getIsbn())) {
            return false;
        }
        if (hasText(req.getCity()) && !containsIgnoreCase(book.getCity(), req.getCity().toLowerCase())) {
            return false;
        }
        return true;
    }

    private BookResponse mapResponseWithOrderedImages(Book book, Double distanceKm) {
        BookResponse response = bookMapper.toResponse(book);
        response.setDistanceKm(distanceKm);

        if (response.getImages() != null) {
            response.getImages().sort(Comparator.comparing(image -> !image.isCover()));
        }

        if ((response.getImageUrls() == null || response.getImageUrls().isEmpty()) && response.getImages() != null) {
            List<String> orderedImageUrls = response.getImages().stream()
                    .map(BookImageResponse::getImageUrl)
                    .filter(this::hasText)
                    .toList();
            response.setImageUrls(orderedImageUrls);
        }

        if (response.getImageUrls() != null && !response.getImageUrls().isEmpty()) {
            response.setCoverImageUrl(response.getImageUrls().get(0));
        }

        return response;
    }

    private void saveImages(Book book, List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return;
        }

        String folder = "books/" + book.getId();
        List<BookImage> bookImages = new ArrayList<>();

        for (int i = 0; i < images.size(); i++) {
            MultipartFile image = images.get(i);
            String imageUrl = s3Service.uploadFile(image, folder);
            if (!hasText(imageUrl)) {
                continue;
            }
            String imageKey = extractS3KeyFromUrl(imageUrl);

            BookImage bookImage = BookImage.builder()
                    .book(book)
                    .imageUrl(imageUrl)
                    .imageKey(imageKey)
                    .isCover(i == 0)
                    .build();
            bookImages.add(bookImage);
        }

        book.getImages().clear();
        book.getImages().addAll(bookImages);
    }

    private void deleteAllBookImages(Book book) {
        if (book.getImages() == null || book.getImages().isEmpty()) {
            return;
        }

        for (BookImage image : book.getImages()) {
            if (hasText(image.getImageKey())) {
                s3Service.deleteFile(image.getImageKey());
            }
        }
    }

    private String extractS3KeyFromUrl(String imageUrl) {
        if (!hasText(imageUrl)) {
            return imageUrl;
        }
        String marker = ".amazonaws.com/";
        int markerIndex = imageUrl.indexOf(marker);
        if (markerIndex == -1) {
            return imageUrl;
        }
        return imageUrl.substring(markerIndex + marker.length());
    }

    private void publishBookEvent(String eventType, Long bookId, Long ownerId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", eventType);
        payload.put("bookId", bookId);
        if (ownerId != null) {
            payload.put("ownerId", ownerId);
        }
        try {
            kafkaTemplate.send(BOOK_EVENTS_TOPIC, payload);
        } catch (RuntimeException ex) {
            log.warn("Failed to publish event {} for book {}", eventType, bookId, ex);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean containsIgnoreCase(String value, String keywordLower) {
        return value != null && value.toLowerCase().contains(keywordLower);
    }

    public UserStatsResponse getUserStats(Long userId) {
        Long donatedCount = bookRepository.countByOwnerIdAndIsDonation(userId, true);
        Long lentCount = bookRepository.countByOwnerIdAndIsLending(userId, true);
        return new UserStatsResponse(
                donatedCount != null ? donatedCount.intValue() : 0,
                lentCount != null ? lentCount.intValue() : 0);
    }
}
