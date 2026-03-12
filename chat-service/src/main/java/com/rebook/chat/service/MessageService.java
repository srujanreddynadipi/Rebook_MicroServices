package com.rebook.chat.service;

import com.rebook.chat.dto.ChatPreview;
import com.rebook.chat.dto.MessageResponse;
import com.rebook.chat.dto.SendMessageRequest;
import com.rebook.chat.entity.Message;
import com.rebook.chat.mapper.MessageMapper;
import com.rebook.chat.repository.MessageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageService(MessageRepository messageRepository,
            MessageMapper messageMapper,
            SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.messageMapper = messageMapper;
        this.messagingTemplate = messagingTemplate;
    }

    public MessageResponse sendMessage(SendMessageRequest request, Long senderId) {
        Message message = Message.builder()
                .requestId(request.getRequestId())
                .senderId(senderId)
                .receiverId(request.getReceiverId())
                .content(request.getContent())
                .build();

        Message savedMessage = messageRepository.save(message);
        MessageResponse response = messageMapper.toResponse(savedMessage);

        messagingTemplate.convertAndSendToUser(
                request.getReceiverId().toString(),
                "/queue/messages",
                response);

        return response;
    }

    public List<MessageResponse> getMessagesByRequestId(Long requestId, Long userId) {
        List<Message> messages = messageRepository.findByRequestIdOrderByCreatedAtAsc(requestId);

        boolean hasUnread = messages.stream()
                .anyMatch(message -> userId.equals(message.getReceiverId()) && !message.isRead());

        if (hasUnread) {
            messageRepository.markAllAsRead(requestId, userId);
            messages.forEach(message -> {
                if (userId.equals(message.getReceiverId())) {
                    message.setRead(true);
                }
            });
        }

        return messages.stream()
                .map(messageMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatPreview> getInbox(Long userId) {
        return messageRepository.findInboxByUserId(userId).stream()
                .map(message -> ChatPreview.builder()
                        .requestId(message.getRequestId())
                        .otherUserId(
                                userId.equals(message.getSenderId()) ? message.getReceiverId() : message.getSenderId())
                        .lastMessage(message.getContent())
                        .lastMessageTime(message.getCreatedAt())
                        .unreadCount(messageRepository.countByRequestIdAndReceiverIdAndIsReadFalse(
                                message.getRequestId(),
                                userId))
                        .build())
                .sorted(Comparator.comparing(ChatPreview::getLastMessageTime).reversed())
                .collect(Collectors.toList());
    }

    public void markAsRead(Long requestId, Long userId) {
        messageRepository.markAllAsRead(requestId, userId);
    }
}
