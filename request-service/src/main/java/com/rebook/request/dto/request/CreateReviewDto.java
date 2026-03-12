package com.rebook.request.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReviewDto {

    @NotNull
    private Long requestId;

    @NotNull
    private Long reviewedUserId;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    private String comment;
}
