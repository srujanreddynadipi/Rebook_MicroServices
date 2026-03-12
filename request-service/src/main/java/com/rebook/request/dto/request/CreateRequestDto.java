package com.rebook.request.dto.request;

import com.rebook.request.entity.RequestType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRequestDto {

    @NotNull
    private Long bookId;

    @NotNull
    private RequestType requestType;

    @Min(1)
    @Max(52)
    private Integer noOfWeeks;
}
