package com.rebook.chat.service;

import com.rebook.chat.dto.ChatPreview;
import com.rebook.chat.dto.MessageResponse;
import com.rebook.chat.dto.SendMessageRequest;
import com.rebook.chat.entity.Message;
import com.rebook.chat.event.NewMessageEvent;
import com.rebook.chat.mapper.MessageMapper;
import com.rebook.chat.repository.MessageRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class MessageService {

    private static final String CHAT_TOPIC = "chat-events";

    private final MessageRepository messageRepository;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, NewMessageEvent> kafkaTemplate;

    public MessageService(MessageRepository messageRepository,
            MessageMapper messageMapper,
            SimpMessagingTemplate messagingTemplate,
            KafkaTemplate<String, NewMessageEvent> kafkaTemplate) {
        this.messageRepository = messageRepository;
        this.messageMapper = messageMapper;
        this.messagingTemplate = messagingTemplate;
        this.kafkaTemplate = kafkaTemplate;
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

        // Publish a Kafka event so notification-service can create a NEW_MESSAGE
        // notification
        try {
            NewMessageEvent event = NewMessageEvent.builder()
                    .messageId(savedMessage.getId())
                    .requestId(savedMessage.getRequestId())
                    .senderId(senderId)
                    .receiverId(savedMessage.getReceiverId())
                    .content(savedMessage.getContent())
                    .build();
            kafkaTemplate.send(CHAT_TOPIC, String.valueOf(savedMessage.getId()), event);
        } catch (Exception e) {
            log.warn("Failed to publish chat Kafka event for message {}: {}", savedMessage.getId(), e.getMessage());
        }

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
