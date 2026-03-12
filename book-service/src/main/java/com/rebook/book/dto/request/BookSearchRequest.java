package com.rebook.book.dto.request;

import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookCondition;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookSearchRequest {

    private String keyword;

    private String author;

    private String publisher;

    private String isbn;

    private BookCategory category;

    private BookCondition condition;

    private String city;

    private Double userLatitude;

    private Double userLongitude;

    @Builder.Default
    private Double radiusKm = 50.0;

    private Boolean isDonation;

    private Boolean isLending;

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 10;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortDir = "desc";
}
