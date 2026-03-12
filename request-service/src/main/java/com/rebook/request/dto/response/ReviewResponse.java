package com.rebook.request.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ReviewResponse {

    private Long id;
    private Long requestId;
    private Long reviewerId;
    private Long reviewedUserId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
