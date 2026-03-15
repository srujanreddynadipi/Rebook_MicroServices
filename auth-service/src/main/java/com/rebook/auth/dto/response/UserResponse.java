package com.rebook.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;

    private String name;

    private String email;

    private String mobile;

    private String city;

    private String pincode;

    private Double latitude;

    private Double longitude;

    private String role;

    private boolean isBanned;

    private Double averageRating;

    private Integer totalRatings;

    private Integer totalBooksDonated;

    private Integer totalBooksLent;

    private LocalDateTime createdAt;
}
