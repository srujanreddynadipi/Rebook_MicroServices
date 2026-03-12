package com.rebook.notification.dto.response;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnReminderResponse {

    private Long requestId;
    private Long bookId;
    private Long borrowerId;
    private Long ownerId;
    private String bookTitle;
    private LocalDate dueDate;
}