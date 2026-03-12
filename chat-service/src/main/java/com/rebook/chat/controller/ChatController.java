package com.rebook.chat.controller;

import com.rebook.chat.dto.ChatPreview;
import com.rebook.chat.dto.MessageResponse;
import com.rebook.chat.dto.SendMessageRequest;
import com.rebook.chat.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class ChatController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(MessageService messageService, SimpMessagingTemplate messagingTemplate) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping
    public MessageResponse sendMessage(@Valid @RequestBody SendMessageRequest request,
            @RequestHeader("userId") Long userId) {
        return messageService.sendMessage(request, userId);
    }

    @GetMapping("/{requestId}")
    public List<MessageResponse> getMessages(@PathVariable Long requestId,
            @RequestHeader("userId") Long userId) {
        return messageService.getMessagesByRequestId(requestId, userId);
    }

    @GetMapping("/inbox")
    public List<ChatPreview> getInbox(@RequestHeader("userId") Long userId) {
        return messageService.getInbox(userId);
    }

    @PutMapping("/{requestId}/read")
    public void markAsRead(@PathVariable Long requestId,
            @RequestHeader("userId") Long userId) {
        messageService.markAsRead(requestId, userId);
    }

    @MessageMapping("/chat.send")
    public MessageResponse handleWebSocketMessage(@Valid @Payload SendMessageRequest request,
            Principal principal) {
        Long senderId = Long.parseLong(principal.getName());
        MessageResponse response = messageService.sendMessage(request, senderId);

        messagingTemplate.convertAndSend(
                "/topic/requests/" + request.getRequestId(),
                response);

        return response;
    }
}
