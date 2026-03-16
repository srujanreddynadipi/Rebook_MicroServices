package com.rebook.chat.service;

import com.rebook.chat.dto.ChatPreview;
import com.rebook.chat.dto.MessageResponse;
import com.rebook.chat.dto.SendMessageRequest;
import com.rebook.chat.entity.Message;
import com.rebook.chat.mapper.MessageMapper;
import com.rebook.chat.repository.MessageRepository;
import com.rebook.chat.event.NewMessageEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

        @Mock
        private MessageRepository messageRepository;

        @Mock
        private MessageMapper messageMapper;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        @Mock
        private KafkaTemplate<String, NewMessageEvent> kafkaTemplate;

        @InjectMocks
        private MessageService messageService;

        private SendMessageRequest sendRequest;
        private Message savedMessage;
        private MessageResponse mappedResponse;

        @BeforeEach
        void setUp() {
                sendRequest = SendMessageRequest.builder()
                                .requestId(101L)
                                .receiverId(22L)
                                .content("hello")
                                .build();

                savedMessage = Message.builder()
                                .id(1L)
                                .requestId(101L)
                                .senderId(11L)
                                .receiverId(22L)
                                .content("hello")
                                .createdAt(LocalDateTime.now())
                                .build();

                mappedResponse = MessageResponse.builder()
                                .id(1L)
                                .requestId(101L)
                                .senderId(11L)
                                .receiverId(22L)
                                .content("hello")
                                .isRead(false)
                                .createdAt(savedMessage.getCreatedAt())
                                .build();
        }

        @Test
        void sendMessage_shouldSaveAndPushToReceiverQueue() {
                when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
                when(messageMapper.toResponse(savedMessage)).thenReturn(mappedResponse);

                MessageResponse result = messageService.sendMessage(sendRequest, 11L);

                assertEquals(mappedResponse, result);

                ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
                verify(messageRepository).save(captor.capture());
                Message toSave = captor.getValue();

                assertEquals(101L, toSave.getRequestId());
                assertEquals(11L, toSave.getSenderId());
                assertEquals(22L, toSave.getReceiverId());
                assertEquals("hello", toSave.getContent());

                verify(messagingTemplate).convertAndSendToUser("22", "/queue/messages", mappedResponse);
        }

        @Test
        void getMessagesByRequestId_shouldMarkReceiverMessagesAsRead() {
                Message unreadForUser = Message.builder()
                                .id(2L)
                                .requestId(101L)
                                .senderId(99L)
                                .receiverId(22L)
                                .content("unread")
                                .isRead(false)
                                .createdAt(LocalDateTime.now().minusMinutes(2))
                                .build();

                Message alreadyRead = Message.builder()
                                .id(3L)
                                .requestId(101L)
                                .senderId(22L)
                                .receiverId(99L)
                                .content("reply")
                                .isRead(true)
                                .createdAt(LocalDateTime.now().minusMinutes(1))
                                .build();

                when(messageRepository.findByRequestIdOrderByCreatedAtAsc(101L))
                                .thenReturn(List.of(unreadForUser, alreadyRead));
                when(messageMapper.toResponse(unreadForUser)).thenReturn(MessageResponse.builder().id(2L).build());
                when(messageMapper.toResponse(alreadyRead)).thenReturn(MessageResponse.builder().id(3L).build());

                List<MessageResponse> result = messageService.getMessagesByRequestId(101L, 22L);

                assertEquals(2, result.size());
                assertTrue(unreadForUser.isRead());
                verify(messageRepository).markAllAsRead(101L, 22L);
        }

        @Test
        void getMessagesByRequestId_shouldNotMarkWhenNoUnreadForUser() {
                Message message = Message.builder()
                                .id(4L)
                                .requestId(101L)
                                .senderId(22L)
                                .receiverId(99L)
                                .content("outgoing")
                                .isRead(false)
                                .createdAt(LocalDateTime.now())
                                .build();

                when(messageRepository.findByRequestIdOrderByCreatedAtAsc(101L)).thenReturn(List.of(message));
                when(messageMapper.toResponse(message)).thenReturn(MessageResponse.builder().id(4L).build());

                List<MessageResponse> result = messageService.getMessagesByRequestId(101L, 22L);

                assertEquals(1, result.size());
                verify(messageRepository, never()).markAllAsRead(101L, 22L);
        }

        @Test
        void getInbox_shouldBuildSortedPreviewWithUnreadCount() {
                Message older = Message.builder()
                                .id(5L)
                                .requestId(1001L)
                                .senderId(44L)
                                .receiverId(22L)
                                .content("older")
                                .createdAt(LocalDateTime.now().minusHours(1))
                                .build();

                Message newer = Message.builder()
                                .id(6L)
                                .requestId(1002L)
                                .senderId(22L)
                                .receiverId(55L)
                                .content("newer")
                                .createdAt(LocalDateTime.now())
                                .build();

                when(messageRepository.findInboxByUserId(22L)).thenReturn(List.of(older, newer));
                when(messageRepository.countByRequestIdAndReceiverIdAndIsReadFalse(1001L, 22L)).thenReturn(3);
                when(messageRepository.countByRequestIdAndReceiverIdAndIsReadFalse(1002L, 22L)).thenReturn(0);

                List<ChatPreview> inbox = messageService.getInbox(22L);

                assertEquals(2, inbox.size());
                assertEquals(1002L, inbox.get(0).getRequestId());
                assertEquals(55L, inbox.get(0).getOtherUserId());
                assertEquals("newer", inbox.get(0).getLastMessage());
                assertEquals(0, inbox.get(0).getUnreadCount());

                assertEquals(1001L, inbox.get(1).getRequestId());
                assertEquals(44L, inbox.get(1).getOtherUserId());
                assertEquals(3, inbox.get(1).getUnreadCount());
        }

        @Test
        void markAsRead_shouldDelegateToRepository() {
                messageService.markAsRead(101L, 22L);

                verify(messageRepository).markAllAsRead(101L, 22L);
        }
}
