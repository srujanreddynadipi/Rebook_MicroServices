package com.rebook.auth.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    private String name;

    private String mobile;

    private String city;

    private String pincode;

    private Double latitude;

    private Double longitude;
}
