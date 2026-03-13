package com.rebook.book.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookImageResponse {

    private Long id;

    private String imageUrl;

    @JsonAlias("cover")
    @JsonProperty("isCover")
    private boolean isCover;
}
