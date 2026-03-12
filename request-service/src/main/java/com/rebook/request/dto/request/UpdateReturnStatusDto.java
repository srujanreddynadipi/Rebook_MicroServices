package com.rebook.request.dto.request;

import com.rebook.request.entity.ReturnStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateReturnStatusDto {

    @NotNull
    private ReturnStatus returnStatus;
}
