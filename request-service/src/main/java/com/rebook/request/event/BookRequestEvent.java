package com.rebook.request.event;

import com.rebook.request.entity.RequestType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookRequestEvent {

    private String eventType;
    private Long requestId;
    private Long bookId;
    private Long senderId;
    private Long receiverId;
    private RequestType requestType;
    private String bookTitle;
    private LocalDateTime timestamp;
}
