package com.rebook.request.dto.response;

import com.rebook.request.entity.RequestStatus;
import com.rebook.request.entity.RequestType;
import com.rebook.request.entity.ReturnStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class BookRequestResponse {

    private Long id;
    private Long bookId;
    private Long senderId;
    private Long receiverId;
    private RequestType requestType;
    private RequestStatus status;
    private Integer noOfWeeks;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private ReturnStatus returnStatus;
    private LocalDateTime createdAt;

    // Populated by service via inter-service calls
    private String senderName;
    private String receiverName;
    private String bookTitle;
    private String bookCoverImageUrl;
}
