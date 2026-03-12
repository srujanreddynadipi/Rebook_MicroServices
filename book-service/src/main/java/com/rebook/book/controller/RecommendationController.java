package com.rebook.book.controller;

import com.rebook.book.dto.response.BookResponse;
import com.rebook.book.service.BookService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final BookService bookService;

    public RecommendationController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<List<BookResponse>> getRecommendations(@PathVariable Long bookId) {
        return ResponseEntity.ok(bookService.getRecommendedBooks(bookId, 6));
    }
}
