# ReBook Architecture And UML

This document is based on the current codebase, Docker orchestration, and service implementations in this repository.

Scope used for these diagrams:
- Included: frontend, api-gateway, eureka-server, auth-service, book-service, request-service, chat-service, notification-service, MySQL, Redis, Kafka, ZooKeeper, AWS S3, and mail delivery.
- Excluded from the main architecture: rag-service, because it exists as a scaffold and is not wired into the active runtime flow.

## 1. System Architecture Diagram

```mermaid
flowchart LR
    user[User]
    admin[Admin]
    frontend[Frontend\nReact + Vite]
    gateway[API Gateway\nSpring Cloud Gateway]
    eureka[Eureka Server\nService Discovery]

    subgraph services[Business Services]
        auth[auth-service\nJWT + user management]
        book[book-service\nbook catalog + S3 + popularity]
        request[request-service\nrequest lifecycle]
        chat[chat-service\nREST + WebSocket STOMP]
        notification[notification-service\nin-app + email notifications]
    end

    subgraph infrastructure[Infrastructure]
        mysql[(MySQL)]
        redis[(Redis)]
        kafka[(Kafka)]
        zookeeper[(ZooKeeper)]
        s3[(AWS S3)]
        smtp[(SMTP / Mail Provider)]
    end

    user --> frontend
    admin --> frontend

    frontend -->|REST /api/**| gateway
    frontend -->|SockJS / STOMP /ws| gateway

    gateway -->|routes via Eureka| auth
    gateway -->|routes via Eureka| book
    gateway -->|routes via Eureka| request
    gateway -->|routes via Eureka| chat
    gateway -->|routes via Eureka| notification
    gateway -. discovery lookup .-> eureka

    auth -. registers .-> eureka
    book -. registers .-> eureka
    request -. registers .-> eureka
    chat -. registers .-> eureka
    notification -. registers .-> eureka

    gateway -->|JWT validation + header propagation\nX-User-Id, X-User-Roles| services

    auth --> mysql
    book --> mysql
    request --> mysql
    chat --> mysql
    notification --> mysql

    book --> redis
    book --> s3

    request -->|GET book details\nPATCH book status| book
    request -->|GET user details| auth
    notification -->|GET user details| auth
    notification -->|GET due soon requests| request

    request -->|publish request-events| kafka
    kafka --> zookeeper
    kafka -->|consume request-events| notification
    kafka -->|consume request-events| book

    notification --> smtp
    chat -->|broadcast /topic/requests/:requestId| frontend
```

## 2. UML Sequence Diagram

This sequence shows the main borrow/request workflow and the async notification path.

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant G as API Gateway
    participant R as Request Service
    participant B as Book Service
    participant K as Kafka
    participant N as Notification Service
    participant A as Auth Service
    participant DB as MySQL
    participant M as Mail Provider

    U->>F: Create request for a book
    F->>G: POST /api/requests
    G->>G: Validate JWT
    G->>R: Forward request with X-User-Id/X-User-Name

    R->>B: GET /api/books/{bookId}
    B-->>R: Book details
    R->>R: Validate availability and ownership
    R->>DB: Save BookRequest(status=PENDING)
    R->>B: PATCH /api/books/{id}/status?status=REQUESTED
    R->>K: Publish REQUEST_CREATED
    R-->>G: BookRequestResponse
    G-->>F: 201 Created

    K-->>N: Consume REQUEST_CREATED
    N->>A: Lookup sender and owner
    A-->>N: User info
    N->>DB: Save in-app notification
    N->>M: Send email to owner

    Note over U,F: Later, the owner can approve or reject the request
    F->>G: PUT /api/requests/{id}/approve
    G->>R: Forward owner action
    R->>DB: Update BookRequest(status=APPROVED)
    R->>B: PATCH book status to BORROWED
    R->>K: Publish REQUEST_APPROVED
    K-->>N: Consume REQUEST_APPROVED
    N->>DB: Save approval notification
    N->>M: Send approval email
```

## 3. UML Domain Class Diagram

This class diagram shows the logical domain model. Some relationships are cross-service references by ID rather than direct JPA associations, which is normal in this microservices design.

```mermaid
classDiagram
    class User {
        +Long id
        +String name
        +String email
        +String mobile
        +String city
        +String pincode
        +Double latitude
        +Double longitude
        +Role role
        +boolean isBanned
        +Double averageRating
        +Integer totalRatings
    }

    class Book {
        +Long id
        +String title
        +String author
        +String publisher
        +String isbn
        +String keywords
        +BookCategory category
        +BookCondition condition
        +String city
        +Double latitude
        +Double longitude
        +boolean isDonation
        +boolean isLending
        +BookStatus status
        +Long ownerId
        +Integer requestCount
    }

    class BookImage {
        +Long id
        +String imageUrl
        +String imageKey
        +boolean isCover
    }

    class BookRequest {
        +Long id
        +Long bookId
        +Long senderId
        +String senderName
        +Long receiverId
        +String receiverName
        +RequestType requestType
        +RequestStatus status
        +Integer noOfWeeks
        +LocalDate borrowDate
        +LocalDate dueDate
        +ReturnStatus returnStatus
    }

    class Review {
        +Long id
        +Long requestId
        +Long reviewerId
        +Long revieweeId
        +Integer rating
        +String comment
    }

    class Message {
        +Long id
        +Long requestId
        +Long senderId
        +Long receiverId
        +String content
        +boolean isRead
        +LocalDateTime createdAt
    }

    class Notification {
        +Long id
        +Long userId
        +String title
        +String message
        +NotificationType type
        +boolean isRead
        +Long referenceId
        +LocalDateTime createdAt
    }

    User "1" --> "0..*" Book : owns via ownerId
    Book "1" *-- "0..*" BookImage : contains
    User "1" --> "0..*" BookRequest : sends
    User "1" --> "0..*" BookRequest : receives
    Book "1" --> "0..*" BookRequest : requested for
    BookRequest "1" --> "0..*" Message : chat thread
    BookRequest "1" --> "0..1" Review : completion review
    User "1" --> "0..*" Notification : receives
```

## 4. Mermaid Source Files

The same diagrams are also available as standalone Mermaid files:
- `docs/diagrams/rebook-architecture.mmd`
- `docs/diagrams/rebook-request-sequence.mmd`
- `docs/diagrams/rebook-domain-class.mmd`

## 5. Commands To Generate Images

Install Mermaid CLI once:

```bash
npm install -g @mermaid-js/mermaid-cli
```

Generate PNG files:

```bash
mmdc -i docs/diagrams/rebook-architecture.mmd -o docs/diagrams/rebook-architecture.png -b white
mmdc -i docs/diagrams/rebook-request-sequence.mmd -o docs/diagrams/rebook-request-sequence.png -b white
mmdc -i docs/diagrams/rebook-domain-class.mmd -o docs/diagrams/rebook-domain-class.png -b white
```

Generate SVG files:

```bash
mmdc -i docs/diagrams/rebook-architecture.mmd -o docs/diagrams/rebook-architecture.svg -b white
mmdc -i docs/diagrams/rebook-request-sequence.mmd -o docs/diagrams/rebook-request-sequence.svg -b white
mmdc -i docs/diagrams/rebook-domain-class.mmd -o docs/diagrams/rebook-domain-class.svg -b white
```