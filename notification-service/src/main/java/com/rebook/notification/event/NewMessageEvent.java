package com.rebook.notification.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewMessageEvent {
    private Long messageId;
    private Long requestId;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String content;
}
