package com.rebook.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatPreview {

    private Long requestId;
    private Long otherUserId;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private int unreadCount;
}
