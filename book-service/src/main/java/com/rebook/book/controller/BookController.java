package com.rebook.book.controller;

import com.rebook.book.dto.request.BookSearchRequest;
import com.rebook.book.dto.request.CreateBookRequest;
import com.rebook.book.dto.request.UpdateBookRequest;
import com.rebook.book.dto.response.BookResponse;
import com.rebook.book.dto.response.UserStatsResponse;
import com.rebook.book.entity.BookStatus;
import com.rebook.book.service.BookService;
import com.rebook.book.service.StudyMaterialAudioService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/books")
@Tag(name = "Books")
public class BookController {

    private final BookService bookService;
    private final StudyMaterialAudioService studyMaterialAudioService;

    public BookController(BookService bookService, StudyMaterialAudioService studyMaterialAudioService) {
        this.bookService = bookService;
        this.studyMaterialAudioService = studyMaterialAudioService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BookResponse> createBook(
            @Valid @RequestPart("bookRequest") CreateBookRequest bookRequest,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestHeader("X-User-Id") Long userId) {
        BookResponse response = bookService.createBook(bookRequest, images, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBookById(@PathVariable Long id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable Long id,
            @RequestPart("bookRequest") UpdateBookRequest bookRequest,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestHeader("X-User-Id") Long userId) {
        BookResponse response = bookService.updateBook(id, bookRequest, images, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Roles") String userRoles) {
        bookService.deleteBook(id, userId, userRoles);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<Page<BookResponse>> searchBooks(@ModelAttribute BookSearchRequest searchRequest) {
        return ResponseEntity.ok(bookService.searchBooks(searchRequest));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<BookResponse>> getMyBooks(
            @RequestHeader("X-User-Id") Long userId,
            Pageable pageable) {
        return ResponseEntity.ok(bookService.getBooksByOwner(userId, pageable));
    }

    @GetMapping("/popular")
    public ResponseEntity<List<BookResponse>> getPopularBooks() {
        return ResponseEntity.ok(bookService.getPopularBooks());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateBookStatus(@PathVariable Long id, @RequestParam BookStatus status) {
        bookService.updateBookStatus(id, status);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{userId}/stats")
    public ResponseEntity<UserStatsResponse> getUserStats(@PathVariable Long userId) {
        return ResponseEntity.ok(bookService.getUserStats(userId));
    }

    @PostMapping(value = "/study-material/audiobook", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = "audio/mpeg")
    public ResponseEntity<byte[]> convertStudyMaterialToAudiobook(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "voice", required = false) String voice) {
        StudyMaterialAudioService.AudioBookResult audioBook = studyMaterialAudioService.convertToAudiobook(file, voice);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + audioBook.fileName() + "\"")
                .contentType(MediaType.parseMediaType("audio/mpeg"))
                .body(audioBook.audioBytes());
    }
}
