package com.rebook.book.dto.request;

import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookCondition;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBookRequest {

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

    @JsonProperty("isDonation")
    private Boolean isDonation;

    @JsonProperty("isLending")
    private Boolean isLending;
}
