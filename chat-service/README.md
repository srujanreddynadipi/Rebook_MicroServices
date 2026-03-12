# ReBook Chat Service Documentation

## 1. Service Overview

Chat Service provides real-time and REST-based messaging for ReBook request conversations.

- Service name: chat-service
- GroupId: com.rebook
- ArtifactId: chat-service
- Java: 17
- Spring Boot: 3.1.12
- Port: 8084
- Database schema: chat_db
- Primary features:
  - Send direct messages between users
  - Fetch conversation history by request
  - Inbox preview per request conversation
  - Mark conversation messages as read
  - Real-time delivery through WebSocket (STOMP + SockJS)

## 2. Project Structure

- src/main/java/com/rebook/chat/ChatServiceApplication.java
- src/main/java/com/rebook/chat/config/SecurityConfig.java
- src/main/java/com/rebook/chat/config/WebSocketConfig.java
- src/main/java/com/rebook/chat/config/WebSocketSecurityConfig.java
- src/main/java/com/rebook/chat/controller/ChatController.java
- src/main/java/com/rebook/chat/dto/SendMessageRequest.java
- src/main/java/com/rebook/chat/dto/MessageResponse.java
- src/main/java/com/rebook/chat/dto/ChatPreview.java
- src/main/java/com/rebook/chat/entity/Message.java
- src/main/java/com/rebook/chat/repository/MessageRepository.java
- src/main/java/com/rebook/chat/service/MessageService.java
- src/main/java/com/rebook/chat/mapper/MessageMapper.java
- src/main/java/com/rebook/chat/security/JwtUtil.java
- src/main/resources/application.yml

## 3. Data Model

### Message Entity

Table: messages

Fields:
- id: Long, primary key, auto-increment
- request_id: Long, required
- sender_id: Long, required
- receiver_id: Long, required
- content: TEXT, required
- is_read: boolean, default false
- created_at: LocalDateTime, auto-populated on insert

Business meaning:
- request_id ties all messages to a request-level conversation.
- sender_id and receiver_id identify message direction.
- is_read tracks receiver-side read state.

## 4. DTO Contracts

### SendMessageRequest
Used for REST and WebSocket send operations.

Fields:
- requestId (required)
- receiverId (required)
- content (required, not blank)

### MessageResponse
Returned for sent and fetched messages.

Fields:
- id
- requestId
- senderId
- receiverId
- content
- isRead
- createdAt

### ChatPreview
Returned by inbox endpoint.

Fields:
- requestId
- otherUserId
- lastMessage
- lastMessageTime
- unreadCount

## 5. Repository Layer

MessageRepository methods:
- findByRequestIdOrderByCreatedAtAsc(Long requestId)
  - Full conversation history in ascending order.
- findByRequestIdOrderByCreatedAtDesc(Long requestId, Pageable pageable)
  - Paginated reverse history.
- findByReceiverIdAndIsReadFalse(Long receiverId)
  - Unread direct messages for a receiver.
- markAllAsRead(Long requestId, Long receiverId)
  - Bulk update unread messages in a conversation for receiver.
- countByRequestIdAndReceiverIdAndIsReadFalse(Long requestId, Long receiverId)
  - Unread count for one user in one conversation.
- findInboxByUserId(Long userId)
  - Native query returning latest message per request conversation where user is sender or receiver.

## 6. Service Layer Behavior

MessageService responsibilities:

### sendMessage(request, senderId)
1. Build Message entity from request and sender.
2. Persist entity.
3. Map to MessageResponse.
4. Push real-time private notification to receiver user queue:
   - destination: /user/{receiverId}/queue/messages
5. Return MessageResponse.

### getMessagesByRequestId(requestId, userId)
1. Load all messages in ascending order.
2. Detect if user has unread messages in this conversation.
3. If unread exists, mark all unread as read for that receiver.
4. Return mapped response list.

### getInbox(userId)
1. Load latest message per request conversation using repository native query.
2. For each conversation, compute:
   - otherUserId
   - unreadCount for current user
3. Sort by lastMessageTime descending.
4. Return ChatPreview list.

### markAsRead(requestId, userId)
- Bulk marks unread conversation messages as read for the receiver.

## 7. REST API

Base path: /api/messages

### POST /
Send message through REST.

Headers:
- userId: sender id

Body:
{
  "requestId": 123,
  "receiverId": 456,
  "content": "Hi there"
}

Response: MessageResponse

### GET /{requestId}
Get all messages for request conversation.

Headers:
- userId: current user id

Response: List<MessageResponse>

### GET /inbox
Get conversation previews for current user.

Headers:
- userId: current user id

Response: List<ChatPreview>

### PUT /{requestId}/read
Mark all unread messages in conversation as read for current user.

Headers:
- userId: current user id

Response: empty body (200 OK)

## 8. WebSocket API

### Connection
- Endpoint: /ws
- Protocol: STOMP over WebSocket
- SockJS fallback enabled
- Allowed origins: all

### Broker setup
- Application destination prefix: /app
- Broker destinations: /topic, /queue

### Send message over WebSocket
- Client sends to: /app/chat.send
- Payload: SendMessageRequest

Server behavior:
1. Resolve sender id from authenticated Principal.
2. Save and push private receiver queue via service.
3. Broadcast conversation event to:
   - /topic/requests/{requestId}

### Subscription patterns
- Private user queue: /user/queue/messages
- Request conversation topic: /topic/requests/{requestId}

## 9. Security Model

### REST
- REST endpoints are permitted in this service.
- Gateway is expected to enforce JWT and pass trusted user context header (userId).

### WebSocket CONNECT
Handled by inbound channel interceptor.

Token extraction order:
1. Authorization header with Bearer token
2. passcode header

Validation:
- Token validated by JwtUtil using app.jwt.secret.
- On success, Authentication principal is set to user id.
- On failure, CONNECT is rejected with AccessDeniedException.

## 10. Configuration

application.yml highlights:

- server.port: 8084
- spring.application.name: chat-service
- datasource:
  - jdbc:mysql://localhost:3307/chat_db
  - username root
  - password root
- jpa:
  - ddl-auto: update
  - show-sql: true
- eureka defaultZone: http://localhost:8761/eureka/
- app.jwt.secret: from APP_JWT_SECRET environment variable (with default fallback)

## 11. How To Run

From chat-service folder:

1. Build:
   - mvn clean package -DskipTests
2. Run tests:
   - mvn test
3. Run service:
   - mvn spring-boot:run

Prerequisites:
- Java 17
- MySQL running and chat_db existing
- Eureka server available if service registration is required

## 12. Verification Status

Functional verification completed with automated unit tests.

Test classes:
- com.rebook.chat.service.MessageServiceTest
- com.rebook.chat.controller.ChatControllerTest
- com.rebook.chat.security.JwtUtilTest

Validated scenarios:
- Message send persistence and private queue dispatch
- Read status marking on conversation fetch
- Inbox preview generation and sort order
- REST endpoint delegation behavior
- WebSocket send handler behavior and request-topic broadcast
- JWT validation and claim extraction

Execution result:
- Tests run: 13
- Failures: 0
- Errors: 0
- Status: PASS

## 13. Current Limitations and Notes

- REST identity currently depends on userId request header passed by gateway.
- No ownership check is implemented to ensure user belongs to request conversation.
- Inbox native query can return duplicate latest rows if two messages share exact same created_at timestamp for one request; add tie-breaker by id if needed.
- Integration tests with real MySQL/WebSocket session are not yet included; current verification is unit-level and compile-level.
- WebSocket CONNECT handshake rejection/acceptance is implemented and reviewed, but not yet covered by integration tests.
