package com.rebook.book.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookCondition;
import com.rebook.book.entity.BookStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookResponse {

    private Long id;

    private String title;

    private String author;

    private String publisher;

    private String isbn;

    private String keywords;

    private BookCategory category;

    private BookCondition condition;

    private String city;

    private Double latitude;

    private Double longitude;

    @JsonAlias("donation")
    @JsonProperty("isDonation")
    private boolean isDonation;

    @JsonAlias("lending")
    @JsonProperty("isLending")
    private boolean isLending;

    private BookStatus status;

    private Long ownerId;

    private Integer requestCount;

    private LocalDateTime createdAt;

    private List<BookImageResponse> images;

    private List<String> imageUrls;

    private String coverImageUrl;

    private Double distanceKm;

    private String ownerName;
}
