package com.rebook.book.dto.request;

import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookCondition;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String author;

    private String publisher;

    private String isbn;

    private String keywords;

    @NotNull
    private BookCategory category;

    @NotNull
    private BookCondition condition;

    @NotBlank
    private String city;

    private Double latitude;

    private Double longitude;

    @JsonProperty("isDonation")
    private boolean isDonation;

    @JsonProperty("isLending")
    private boolean isLending;

    @AssertTrue(message = "At least one of donation or lending must be true")
    public boolean isAtLeastOneModeEnabled() {
        return isDonation || isLending;
    }
}
