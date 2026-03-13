package com.rebook.chat.controller;

import com.rebook.chat.dto.ChatPreview;
import com.rebook.chat.dto.MessageResponse;
import com.rebook.chat.dto.SendMessageRequest;
import com.rebook.chat.service.MessageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private MessageService messageService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private Principal principal;

    @Test
    void sendMessage_shouldDelegateToService() {
        ChatController controller = new ChatController(messageService, messagingTemplate);
        SendMessageRequest request = SendMessageRequest.builder()
                .requestId(10L)
                .receiverId(2L)
                .content("hello")
                .build();
        MessageResponse response = MessageResponse.builder().id(1L).build();

        when(messageService.sendMessage(request, 1L)).thenReturn(response);

        MessageResponse result = controller.sendMessage(request, "1", null);

        assertEquals(response, result);
        verify(messageService).sendMessage(request, 1L);
    }

    @Test
    void getMessages_shouldDelegateToService() {
        ChatController controller = new ChatController(messageService, messagingTemplate);
        List<MessageResponse> responses = List.of(MessageResponse.builder().id(1L).build());

        when(messageService.getMessagesByRequestId(99L, 3L)).thenReturn(responses);

        List<MessageResponse> result = controller.getMessages(99L, "3", null);

        assertEquals(1, result.size());
        verify(messageService).getMessagesByRequestId(99L, 3L);
    }

    @Test
    void getInbox_shouldDelegateToService() {
        ChatController controller = new ChatController(messageService, messagingTemplate);
        List<ChatPreview> previews = List.of(
                ChatPreview.builder()
                        .requestId(10L)
                        .otherUserId(2L)
                        .lastMessage("latest")
                        .lastMessageTime(LocalDateTime.now())
                        .unreadCount(1)
                        .build());

        when(messageService.getInbox(3L)).thenReturn(previews);

        List<ChatPreview> result = controller.getInbox("3", null);

        assertEquals(1, result.size());
        verify(messageService).getInbox(3L);
    }

    @Test
    void markAsRead_shouldDelegateToService() {
        ChatController controller = new ChatController(messageService, messagingTemplate);

        controller.markAsRead(50L, "3", null);

        verify(messageService).markAsRead(50L, 3L);
    }

    @Test
    void handleWebSocketMessage_shouldSendToServiceAndBroadcastRequestTopic() {
        ChatController controller = new ChatController(messageService, messagingTemplate);
        SendMessageRequest request = SendMessageRequest.builder()
                .requestId(77L)
                .receiverId(8L)
                .content("ws")
                .build();

        MessageResponse response = MessageResponse.builder()
                .id(100L)
                .requestId(77L)
                .senderId(5L)
                .receiverId(8L)
                .content("ws")
                .build();

        when(principal.getName()).thenReturn("5");
        when(messageService.sendMessage(request, 5L)).thenReturn(response);

        MessageResponse result = controller.handleWebSocketMessage(request, principal);

        assertEquals(response, result);
        verify(messageService).sendMessage(request, 5L);
        verify(messagingTemplate).convertAndSend("/topic/requests/77", response);
    }
}
