# Kafka + ZooKeeper Bundle

Generated: 2026-04-12 11:26:41

This file bundles infrastructure, configuration, producer/consumer code, topic definitions, and event payloads related to Kafka and ZooKeeper in this repository.

## Included Files

- docker-compose.yml
- docs/architecture.md
- request-service/src/main/resources/application.yml
- request-service/src/main/resources/application-docker.yml
- request-service/src/main/java/com/rebook/request/config/KafkaProducerConfig.java
- request-service/src/main/java/com/rebook/request/config/KafkaTopicConfig.java
- request-service/src/main/java/com/rebook/request/event/BookRequestEvent.java
- request-service/src/main/java/com/rebook/request/service/RequestService.java
- book-service/src/main/resources/application.yml
- book-service/src/main/resources/application-docker.yml
- book-service/src/main/java/com/rebook/book/config/KafkaConsumerConfig.java
- book-service/src/main/java/com/rebook/book/service/BookService.java
- chat-service/src/main/resources/application.yml
- chat-service/src/main/resources/application-docker.yml
- chat-service/src/main/java/com/rebook/chat/config/KafkaProducerConfig.java
- chat-service/src/main/java/com/rebook/chat/config/KafkaTopicConfig.java
- chat-service/src/main/java/com/rebook/chat/event/NewMessageEvent.java
- chat-service/src/main/java/com/rebook/chat/service/MessageService.java
- notification-service/src/main/resources/application.yml
- notification-service/src/main/resources/application-docker.yml
- notification-service/src/main/java/com/rebook/notification/config/KafkaChatConsumerConfig.java
- notification-service/src/main/java/com/rebook/notification/consumer/RequestEventConsumer.java
- notification-service/src/main/java/com/rebook/notification/consumer/ChatEventConsumer.java
- notification-service/src/main/java/com/rebook/notification/event/BookRequestEvent.java
- notification-service/src/main/java/com/rebook/notification/event/NewMessageEvent.java

---

## File: docker-compose.yml

```
services:
  mysql:
    image: mysql:8.0
    container_name: rebook-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
    ports:
      - "3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h localhost -uroot -p${MYSQL_ROOT_PASSWORD:-root} || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    networks:
      - rebook-network

  rag-postgres:
    image: pgvector/pgvector:pg16
    container_name: rebook-rag-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ragdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5544:5432"
    volumes:
      - rag_postgres_data:/var/lib/postgresql/data
      - ./rag-service/src/main/resources/docker-pgvector-init.sql:/docker-entrypoint-initdb.d/01-pgvector.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ragdb"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    networks:
      - rebook-network

  redis:
    image: redis:7-alpine
    container_name: rebook-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    networks:
      - rebook-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: rebook-zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"
    networks:
      - rebook-network

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: rebook-kafka
    restart: unless-stopped
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,PLAINTEXT_INTERNAL://0.0.0.0:29092
    ports:
      - "9092:9092"
    volumes:
      - kafka_data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD-SHELL", "kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1 || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 30s
    networks:
      - rebook-network

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: rebook-kafka-ui
    restart: unless-stopped
    depends_on:
      - kafka
    environment:
      KAFKA_CLUSTERS_0_NAME: rebook-local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
    ports:
      - "8090:8080"
    networks:
      - rebook-network

  eureka-server:
    build: ./eureka-server
    image: srujanreddynadipi/rebook-eureka-server:latest
    container_name: rebook-eureka-server
    restart: unless-stopped
    ports:
      - "8761:8761"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8761/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 40s
    networks:
      - rebook-network

  api-gateway:
    build: ./api-gateway
    image: srujanreddynadipi/rebook-api-gateway:latest
    container_name: rebook-api-gateway
    restart: unless-stopped
    depends_on:
      eureka-server:
        condition: service_healthy
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      APP_JWT_SECRET: ${APP_JWT_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  auth-service:
    build: ./auth-service
    image: srujanreddynadipi/rebook-auth-service:latest
    container_name: rebook-auth-service
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      eureka-server:
        condition: service_healthy
    ports:
      - "8081:8081"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      APP_JWT_SECRET: ${APP_JWT_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8081/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  book-service:
    build: ./book-service
    image: srujanreddynadipi/rebook-book-service:latest
    container_name: rebook-book-service
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      eureka-server:
        condition: service_healthy
      kafka:
        condition: service_started
      redis:
        condition: service_healthy
      tts:
        condition: service_started
    ports:
      - "8082:8082"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      APP_AWS_BUCKET_NAME: ${APP_AWS_BUCKET_NAME:-}
      APP_AWS_REGION: ${APP_AWS_REGION:-us-east-1}
      APP_AUDIOBOOK_TTS_API_URL: ${APP_AUDIOBOOK_TTS_API_URL:-tcp://tts:10200}
      APP_AUDIOBOOK_TTS_API_KEY: ${APP_AUDIOBOOK_TTS_API_KEY:-}
      APP_AUDIOBOOK_TTS_PROVIDER: ${APP_AUDIOBOOK_TTS_PROVIDER:-piper}
      APP_AUDIOBOOK_TTS_MODEL: ${APP_AUDIOBOOK_TTS_MODEL:-en_US-lessac-medium}
      APP_AUDIOBOOK_TTS_VOICE: ${APP_AUDIOBOOK_TTS_VOICE:-alloy}
      APP_AUDIOBOOK_TTS_COQUI_SPEAKER_ID: ${APP_AUDIOBOOK_TTS_COQUI_SPEAKER_ID:-}
      APP_AUDIOBOOK_TTS_COQUI_LANGUAGE_ID: ${APP_AUDIOBOOK_TTS_COQUI_LANGUAGE_ID:-}
      APP_AUDIOBOOK_TTS_RESPONSE_FORMAT: ${APP_AUDIOBOOK_TTS_RESPONSE_FORMAT:-wav}
      APP_AUDIOBOOK_TTS_MAX_CHARS_PER_CHUNK: ${APP_AUDIOBOOK_TTS_MAX_CHARS_PER_CHUNK:-2000}
      APP_AUDIOBOOK_TTS_MAX_TOTAL_CHARS: ${APP_AUDIOBOOK_TTS_MAX_TOTAL_CHARS:-12000}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:-}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-}
      AWS_SESSION_TOKEN: ${AWS_SESSION_TOKEN:-}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8082/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  request-service:
    build: ./request-service
    image: srujanreddynadipi/rebook-request-service:latest
    container_name: rebook-request-service
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      eureka-server:
        condition: service_healthy
      kafka:
        condition: service_started
    ports:
      - "8083:8083"
    environment:
      SPRING_PROFILES_ACTIVE: docker
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8083/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  chat-service:
    build: ./chat-service
    image: srujanreddynadipi/rebook-chat-service:latest
    container_name: rebook-chat-service
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      eureka-server:
        condition: service_healthy
    ports:
      - "8084:8084"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      APP_JWT_SECRET: ${APP_JWT_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8084/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  notification-service:
    build: ./notification-service
    image: srujanreddynadipi/rebook-notification-service:latest
    container_name: rebook-notification-service
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
      eureka-server:
        condition: service_healthy
      kafka:
        condition: service_started
    ports:
      - "8085:8085"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      MAIL_USERNAME: ${MAIL_USERNAME:-}
      MAIL_PASSWORD: ${MAIL_PASSWORD:-}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8085/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  rag-service:
    build: ./rag-service
    image: srujanreddynadipi/rebook-rag-service:latest
    container_name: rebook-rag-service
    restart: unless-stopped
    depends_on:
      rag-postgres:
        condition: service_healthy
      eureka-server:
        condition: service_healthy
    ports:
      - "8086:8086"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      SPRING_PROFILES_ACTIVE: docker
      APP_JWT_SECRET: ${APP_JWT_SECRET}
      APP_OLLAMA_PRIMARY_BASE_URL: ${APP_OLLAMA_PRIMARY_BASE_URL:-}
      APP_OLLAMA_FALLBACK_BASE_URL: ${APP_OLLAMA_FALLBACK_BASE_URL:-http://host.docker.internal:11434}
      APP_OLLAMA_ENABLE_FALLBACK: ${APP_OLLAMA_ENABLE_FALLBACK:-true}
      APP_OLLAMA_CHAT_MODEL: ${APP_OLLAMA_CHAT_MODEL:-gemma:2b}
      APP_OLLAMA_EMBEDDING_MODEL: ${APP_OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
      APP_OLLAMA_REQUEST_TIMEOUT_SECONDS: ${APP_OLLAMA_REQUEST_TIMEOUT_SECONDS:-180}
      SPRING_AI_OLLAMA_BASE_URL: ${SPRING_AI_OLLAMA_BASE_URL:-http://host.docker.internal:11434}
      SPRING_AI_OLLAMA_CHAT_MODEL: ${SPRING_AI_OLLAMA_CHAT_MODEL:-gemma:2b}
      SPRING_AI_OLLAMA_EMBEDDING_MODEL: ${SPRING_AI_OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8086/actuator/health | grep -q '\"status\":\"UP\"' || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 8
      start_period: 60s
    networks:
      - rebook-network

  frontend:
    build: ./frontend
    image: srujanreddynadipi/rebook-frontend:latest
    container_name: rebook-frontend
    restart: unless-stopped
    depends_on:
      api-gateway:
        condition: service_started
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks:
      - rebook-network

  tts:
    image: lscr.io/linuxserver/piper:latest
    container_name: rebook-tts
    restart: always
    environment:
      PUID: ${PUID:-1000}
      PGID: ${PGID:-1000}
      TZ: ${TZ:-Etc/UTC}
      PIPER_VOICE: ${APP_AUDIOBOOK_TTS_MODEL:-en_US-lessac-medium}
    ports:
      - "10200:10200"
    volumes:
      - piper_data:/config
    networks:
      - rebook-network

volumes:
  mysql_data:
  redis_data:
  kafka_data:
  piper_data:
  rag_postgres_data:

networks:
  rebook-network:
    driver: bridge
```

## File: docs/architecture.md

```
# Architecture

## System Architecture

Kitabi uses a microservices architecture with an API Gateway at the edge and Eureka-based discovery for internal routing. The split is domain-driven:

- Auth Service owns identity, tokens, profile, and admin moderation.
- Book Service owns catalog, search, recommendations, media upload, and audiobook conversion.
- Request Service owns the request state machine and review lifecycle.
- Chat Service owns direct request-scoped messaging.
- Notification Service owns notification persistence and email fanout.
- RAG Service owns document ingestion, vector retrieval, and LLM chat.

This separation enforces single-responsibility boundaries and allows targeted scaling and isolated changes per domain.

## Service Communication

### Synchronous Communication

1. Client calls API Gateway (`:8080`).
2. Gateway validates JWT for protected routes.
3. Gateway forwards to target services using `lb://service-name` via Eureka.
4. Services perform local DB operations and return response.

### Asynchronous Communication

Kafka topics are used for eventual-consistency and notifications:

| Topic | Producer | Consumer | Purpose | Payload |
|---|---|---|---|---|
| `request-events` | request-service | notification-service, book-service | Request lifecycle event propagation | `BookRequestEvent` |
| `chat-events` | chat-service | notification-service | New message notification fanout | `NewMessageEvent` |
| `book-events` | book-service | currently no explicit consumer in this repo | Internal observability/event extension | JSON map |

## Data Flow Diagrams

### User Registration Flow

1. `POST /api/auth/register` hits API Gateway.
2. Gateway forwards to auth-service (`lb://auth-service`).
3. auth-service validates payload and checks duplicate email.
4. Password is hashed using BCrypt.
5. User row is inserted into `auth_db.users`.
6. access token + refresh token are generated.
7. Response `201 Created` returns user + token pair.

### JWT Login/Refresh Flow

1. User logs in via `POST /api/auth/login`.
2. auth-service validates credentials and ban status.
3. access token (`15m`) + refresh token (`7d`) are issued.
4. Frontend stores tokens in local storage.
5. For protected calls, Axios sends `Authorization: Bearer <access>`.
6. Gateway filter validates token and injects `X-User-Id`, `X-User-Name`, `X-User-Roles`.
7. On `401`, Axios refresh interceptor calls `POST /api/auth/refresh-token`.
8. New access token is stored and queued failed requests are replayed.

### Book Request Flow (Create -> Approve -> Borrow -> Return)

1. Requester creates request via `POST /api/requests`.
2. request-service fetches book details from book-service (`/api/books/{id}`).
3. request-service validates availability and duplicate pending requests.
4. request row inserted with `status=PENDING`, `returnStatus=PENDING`.
5. request-service patches book status to `REQUESTED`.
6. `REQUEST_CREATED` event emitted to `request-events`.
7. notification-service consumes event and creates owner notification + optional email.
8. Owner approves via `PUT /api/requests/{id}/approve`.
9. request status -> `APPROVED`; lending due date is computed if needed.
10. request-service patches book status to `BORROWED`.
11. `REQUEST_APPROVED` event emitted; requester gets notification/email.
12. Owner marks return via `PUT /api/requests/{id}/return-status` with `RETURNED`.
13. request-service patches book status back to `AVAILABLE`.
14. `REQUEST_RETURNED` emitted and owner receives completion notification.

Alternative branches:

- Owner reject: `PENDING -> REJECTED`, book back to `AVAILABLE`, `REQUEST_REJECTED`.
- Requester cancel: `PENDING -> CANCELLED`, book back to `AVAILABLE`, `REQUEST_CANCELLED`.

### Notification Flow

1. request-service publishes lifecycle events to `request-events`.
2. chat-service publishes message events to `chat-events`.
3. notification-service Kafka listeners consume both topics.
4. notification rows are persisted in `notification_db.notifications`.
5. For specific events, email service sends SMTP mail.
6. Frontend polls notifications and unread count endpoints.

### Chat Flow

1. User sends REST message (`POST /api/messages`) or WebSocket message (`/app/chat.send`).
2. chat-service stores message row in `chat_db.messages`.
3. chat-service emits to WebSocket destination for live chat.
4. chat-service emits `NewMessageEvent` to `chat-events`.
5. notification-service creates `NEW_MESSAGE` notification for recipient.

## Database Schema

Schema is inferred from JPA entity mappings.

### Auth Service (`auth_db`)

Table: `users`

- `id` BIGINT PK
- `name` VARCHAR NOT NULL
- `email` VARCHAR UNIQUE NOT NULL
- `password` VARCHAR NOT NULL
- `mobile` VARCHAR
- `city` VARCHAR
- `pincode` VARCHAR
- `latitude` DOUBLE
- `longitude` DOUBLE
- `role` ENUM STRING (`ROLE_USER`, `ROLE_ADMIN`)
- `is_banned` BOOLEAN
- `average_rating` DOUBLE
- `total_ratings` INT
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### Book Service (`book_db`)

Table: `books`

- `id` BIGINT PK
- `title` VARCHAR
- `author` VARCHAR
- `publisher` VARCHAR
- `isbn` VARCHAR
- `keywords` VARCHAR/TEXT
- `category` ENUM STRING (`BookCategory`)
- `book_condition` ENUM STRING (`BookCondition`)
- `city` VARCHAR
- `latitude` DOUBLE
- `longitude` DOUBLE
- `is_donation` BOOLEAN
- `is_lending` BOOLEAN
- `status` ENUM STRING (`AVAILABLE`, `REQUESTED`, `BORROWED`)
- `owner_id` BIGINT
- `request_count` INT
- `created_at` TIMESTAMP

Table: `book_images`

- `id` BIGINT PK
- `book_id` BIGINT FK -> books.id
- `image_url` VARCHAR
- `image_key` VARCHAR
- `is_cover` BOOLEAN

Relationship:

- `books 1..* book_images` via `Book.images` + `BookImage.book`.

### Request Service (`request_db`)

Table: `book_requests`

- `id` BIGINT PK
- `book_id` BIGINT
- `sender_id` BIGINT
- `sender_name` VARCHAR(120)
- `receiver_id` BIGINT
- `receiver_name` VARCHAR(120)
- `request_type` ENUM STRING (`DONATION`, `LENDING`)
- `status` ENUM STRING (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
- `no_of_weeks` INT
- `borrow_date` DATE
- `due_date` DATE
- `return_status` ENUM STRING (`PENDING`, `RETURNED`, `NOT_RETURNED`)
- `created_at` TIMESTAMP

Table: `reviews`

- `id` BIGINT PK
- `request_id` BIGINT
- `reviewer_id` BIGINT
- `reviewed_user_id` BIGINT
- `rating` INT (1..5)
- `comment` TEXT
- `created_at` TIMESTAMP

### Chat Service (`chat_db`)

Table: `messages` (inferred from entity/repository usage)

- `id` BIGINT PK
- `request_id` BIGINT
- `sender_id` BIGINT
- `receiver_id` BIGINT
- `content` TEXT
- `is_read` BOOLEAN
- `created_at` TIMESTAMP

### Notification Service (`notification_db`)

Table: `notifications`

- `id` BIGINT PK
- `user_id` BIGINT
- `title` VARCHAR
- `message` TEXT
- `type` ENUM STRING (`REQUEST_RECEIVED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_RETURNED`, `RETURN_REMINDER`, `NEW_MESSAGE`, `SYSTEM`)
- `is_read` BOOLEAN
- `reference_id` BIGINT
- `created_at` TIMESTAMP

### RAG Service (`ragdb` in Postgres)

- Uses pgvector-backed entities for chunks/embeddings.
- Stores documents and chunk vectors for semantic retrieval.

## Security Architecture

### Gateway JWT Filter

Gateway validates all protected routes and bypasses:

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/refresh-token`
- `/eureka/**`
- `/actuator/**`

On valid token, gateway propagates:

- `X-User-Id`
- `X-User-Name`
- `X-User-Roles`

### Role-based Authorization

- Admin endpoints in auth-service use `@PreAuthorize("hasRole('ADMIN')")`.
- Gateway exposes admin route family as `/api/admin/users/**` with JWT enforced.
- Frontend admin routes are guarded by `ProtectedRoute requireAdmin`.

### Token Lifecycle

- Access token: short-lived (`15 minutes`).
- Refresh token: long-lived (`7 days`).
- Frontend auto-refreshes once on `401`, retries pending calls, and redirects to login when refresh fails.

## Service Responsibilities (Deeper View)

### Auth Service Boundary

- Owns user identity and role state.
- Is the sole issuer of access and refresh tokens.
- Exposes profile and admin moderation APIs.
- Is consumed by request-service and notification-service for user enrichment.

### Book Service Boundary

- Owns catalog and image metadata.
- Integrates with S3 for cover/media persistence.
- Maintains searchable fields and optional geo constraints.
- Reacts to request lifecycle indirectly via status patches and request-events consumer.

### Request Service Boundary

- Owns the request state machine and review model.
- Uses synchronous calls for validation (book lookup, user lookup).
- Emits immutable lifecycle events through Kafka.
- Keeps borrowing due-date semantics in one place.

### Chat Service Boundary

- Owns message persistence and retrieval semantics.
- Owns read/unread transitions.
- Supports both REST and websocket messaging.
- Emits lightweight chat events for notification fanout.

### Notification Service Boundary

- Owns user notification history and unread counters.
- Consumes request and chat events and maps them to notification types.
- Triggers optional outbound email delivery.
- Keeps notification policy separate from request/chat core logic.

### RAG Service Boundary

- Owns document indexing, chunking, embedding generation, and retrieval.
- Uses pgvector-backed Postgres for semantic search.
- Calls Ollama endpoint(s) for generation and embeddings.
- Is routed through gateway under `/api/rag/**`.

## Reliability and Failure Behavior

### Token Failure

- Invalid/expired token is rejected at gateway with `401`.
- Frontend refresh flow retries once and preserves pending requests.

### Event Failure

- Kafka publish is wrapped with warning logs; business writes are not always rolled back on producer failure.
- Consumers are resilient to malformed/null payloads and log warnings.

### Downstream Service Failure

- request-service wraps book/user enrichment calls with fallback behavior when possible.
- notification-service can still persist notifications even when user profile enrichment fails.

### SMTP Failure

- In-app notifications remain primary source of truth.
- mail health is disabled in actuator to avoid hard-failing overall health endpoint.

## Data Ownership Rules

- `auth_db.users` is authoritative for identity and role.
- `book_db.books` + `book_db.book_images` are authoritative for catalog media and listing state.
- `request_db.book_requests` + `request_db.reviews` are authoritative for transaction lifecycle and peer feedback.
- `chat_db.messages` is authoritative for conversation history.
- `notification_db.notifications` is authoritative for user notification feed.
- `ragdb` (Postgres + pgvector) is authoritative for semantic retrieval artifacts.

## Observability and Diagnostics

- Core services expose actuator health endpoints used by compose health checks.
- Kafka UI provides operational inspection for topics and consumer groups.
- Gateway logs route activity and can be used to trace entrypoint behavior.
- CI pipeline output forms baseline build/test observability for every merge target.

## Security Posture Recommendations

- Restrict CORS in gateway for production domains only.
- Move secrets from plaintext `.env` files to managed secret stores.
- Prefer EC2 IAM roles over static AWS keys.
- Restrict SSH ingress (`22`) to fixed CIDRs.
- Avoid public exposure of internal data-plane ports (MySQL/Redis/Kafka).

## Sequence Narratives

### Catalog Upload Sequence

1. Client submits multipart request with metadata and files.
2. gateway authenticates and forwards to book-service.
3. book-service persists metadata row in `books`.
4. book-service uploads images to S3 (`books/{id}` prefix).
5. image rows are created in `book_images`.
6. optional `book-events` message is emitted.
7. response returns canonical `BookResponse` including ordered images.

### Notification Read Sequence

1. frontend fetches paged notifications.
2. user opens notification detail or notification list item.
3. frontend calls `PUT /api/notifications/{id}/read`.
4. notification-service validates caller user id.
5. `is_read=true` persisted and unread badge query invalidated on client.

## Capacity Considerations

- gateway should scale for connection count and auth throughput.
- request-service and notification-service require stable Kafka connectivity.
- chat-service requires websocket-aware load balancing and sticky/session strategy if scaled.
- rag-service sizing should account for embedding model and prompt context window load.

## Data Consistency Model

- writes to primary domain tables are strongly consistent within local transaction.
- cross-service updates are eventually consistent via Kafka events and HTTP patch calls.
- UI reflects eventual state through polling/query invalidation and websocket updates.

## Migration and Compatibility Notes

- gateway route definitions are explicit and method-scoped, reducing accidental exposure.
- notification headers support both `X-User-Id` and legacy `userId` for backward compatibility.
- frontend includes graceful fallbacks when optional endpoints (for example, mark-all-read fallback strategy) are unavailable during rolling updates.

## Threat Model Snapshot

- primary threats: token theft, overexposed management ports, weak secret handling, unrestricted CORS.
- compensating controls in current design: JWT validation at edge, role checks on admin APIs, health endpoint monitoring, split deployment boundaries.
- recommended additions: rate limiting at gateway, WAF at edge, centralized secret management, and audit logging for admin actions.

## Glossary

- **Gateway**: API edge service handling JWT verification and route dispatch.
- **Eureka**: service registry for dynamic lookup.
- **RAG**: retrieval-augmented generation over indexed document chunks.
- **Eventual consistency**: asynchronous propagation where updates become visible after event processing.

## Infrastructure

### Docker Network

- Single bridge network: `rebook-network`.
- All services communicate over internal container DNS names.

### Named Volumes

- `mysql_data`, `redis_data`, `kafka_data`, `piper_data`, `rag_postgres_data`.

### Health Checks

- Core services include actuator-based health checks.
- mysql/redis/kafka/rag-postgres use protocol-specific checks.

### EC2 Topology

Deployment pipeline targets two EC2 environments:

1. Main EC2: frontend, gateway, eureka, auth, book, request, chat, notification, mysql, redis, kafka stack.
2. Separate RAG EC2: rag-service + rag-postgres with `EUREKA_DEFAULT_ZONE` pointed to main stack Eureka.

### S3 Image Storage Pattern

- book-service uploads images to S3 through `S3Service`.
- images are grouped by `books/{bookId}` folder prefix.
- stored metadata includes URL + object key for deletion.

### Redis Caching

- Spring cache manager stores selected book query caches.
- ZSET `books:popularity` tracks request-driven popularity scores.
```

## File: request-service/src/main/resources/application.yml

```
server:
  port: 8083

spring:
  application:
    name: request-service

  datasource:
    url: jdbc:mysql://localhost:3307/request_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: request-service
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.rebook.*"
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true

app:
  book-service:
    url: http://localhost:8082
  auth-service:
    url: http://localhost:8081

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method

management:
  endpoints:
    web:
      exposure:
        include: health,info

logging:
  level:
    com.rebook.request: DEBUG
```

## File: request-service/src/main/resources/application-docker.yml

```
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/request_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
  kafka:
    bootstrap-servers: kafka:29092

app:
  book-service:
    url: http://book-service:8082
  auth-service:
    url: http://auth-service:8081

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
```

## File: request-service/src/main/java/com/rebook/request/config/KafkaProducerConfig.java

```
package com.rebook.request.config;

import com.rebook.request.event.BookRequestEvent;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, BookRequestEvent> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, BookRequestEvent> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
```

## File: request-service/src/main/java/com/rebook/request/config/KafkaTopicConfig.java

```
package com.rebook.request.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic requestEventsTopic() {
        return TopicBuilder.name("request-events")
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic bookEventsTopic() {
        return TopicBuilder.name("book-events")
                .partitions(1)
                .replicas(1)
                .build();
    }
}
```

## File: request-service/src/main/java/com/rebook/request/event/BookRequestEvent.java

```
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
```

## File: request-service/src/main/java/com/rebook/request/service/RequestService.java

```
package com.rebook.request.service;

import com.rebook.request.dto.request.CreateRequestDto;
import com.rebook.request.dto.request.UpdateReturnStatusDto;
import com.rebook.request.dto.response.BookRequestResponse;
import com.rebook.request.dto.response.ReturnReminderResponse;
import com.rebook.request.entity.*;
import com.rebook.request.event.BookRequestEvent;
import com.rebook.request.repository.BookRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RequestService {

    private static final String TOPIC = "request-events";

    private final BookRequestRepository bookRequestRepository;
    private final KafkaTemplate<String, BookRequestEvent> kafkaTemplate;
    private final RestTemplate restTemplate;

    @Value("${app.book-service.url}")
    private String bookServiceUrl;

    @Value("${app.auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    // -------------------------------------------------------------------------
    // Create request
    // -------------------------------------------------------------------------

    public BookRequestResponse createRequest(CreateRequestDto dto, Long senderId, String senderName) {
        // 1. Fetch book details from book-service
        BookDto book = fetchBook(dto.getBookId());

        // 2. Validate book availability
        if (!"AVAILABLE".equals(book.getStatus())) {
            throw new IllegalStateException("Book is not available for requests");
        }

        // 3. Sender must not be the owner
        if (book.getOwnerId().equals(senderId)) {
            throw new IllegalArgumentException("You cannot request your own book");
        }

        // 4. No duplicate PENDING request from same sender
        boolean alreadyPending = bookRequestRepository
                .findByBookIdAndSenderIdAndStatusIn(dto.getBookId(), senderId,
                        List.of(RequestStatus.PENDING))
                .isPresent();
        if (alreadyPending) {
            throw new IllegalStateException("You already have a pending request for this book");
        }

        // 5. Lending requires noOfWeeks
        if (RequestType.LENDING.equals(dto.getRequestType()) && dto.getNoOfWeeks() == null) {
            throw new IllegalArgumentException("noOfWeeks is required for LENDING requests");
        }

        // 6. Persist request
        String receiverName = resolveDisplayName(
                book.getOwnerId(),
                book.getOwnerName(),
                false);

        BookRequest request = BookRequest.builder()
                .bookId(dto.getBookId())
                .senderId(senderId)
                .senderName(senderName) // Store as-is; toEnrichedResponse will enrich
                .receiverId(book.getOwnerId())
                .receiverName(receiverName)
                .requestType(dto.getRequestType())
                .status(RequestStatus.PENDING)
                .noOfWeeks(dto.getNoOfWeeks())
                .returnStatus(ReturnStatus.PENDING)
                .build();

        request = bookRequestRepository.save(request);

        // 7. Update book status to REQUESTED
        updateBookStatus(dto.getBookId(), "REQUESTED");

        // 8. Publish Kafka event
        publishEvent("REQUEST_CREATED", request, book.getTitle());

        return toEnrichedResponse(request, book);
    }

    // -------------------------------------------------------------------------
    // Approve request
    // -------------------------------------------------------------------------

    public BookRequestResponse approveRequest(Long requestId, Long approverId) {
        BookRequest request = loadRequest(requestId);
        assertReceiver(request, approverId);
        assertStatus(request, RequestStatus.PENDING);

        request.setStatus(RequestStatus.APPROVED);

        if (RequestType.LENDING.equals(request.getRequestType())) {
            request.setBorrowDate(LocalDate.now());
            request.setDueDate(LocalDate.now().plusWeeks(request.getNoOfWeeks()));
        }

        request = bookRequestRepository.save(request);

        updateBookStatus(request.getBookId(), "BORROWED");

        BookDto book = fetchBookQuietly(request.getBookId());
        publishEvent("REQUEST_APPROVED", request, book != null ? book.getTitle() : null);

        return toEnrichedResponse(request, book);
    }

    // -------------------------------------------------------------------------
    // Reject request
    // -------------------------------------------------------------------------

    public BookRequestResponse rejectRequest(Long requestId, Long rejecterId) {
        BookRequest request = loadRequest(requestId);
        assertReceiver(request, rejecterId);
        assertStatus(request, RequestStatus.PENDING);

        request.setStatus(RequestStatus.REJECTED);
        request = bookRequestRepository.save(request);

        updateBookStatus(request.getBookId(), "AVAILABLE");

        BookDto book = fetchBookQuietly(request.getBookId());
        publishEvent("REQUEST_REJECTED", request, book != null ? book.getTitle() : null);

        return toEnrichedResponse(request, book);
    }

    // -------------------------------------------------------------------------
    // Cancel request
    // -------------------------------------------------------------------------

    public BookRequestResponse cancelRequest(Long requestId, Long requesterId) {
        BookRequest request = loadRequest(requestId);
        assertSender(request, requesterId);
        assertStatus(request, RequestStatus.PENDING);

        request.setStatus(RequestStatus.CANCELLED);
        request = bookRequestRepository.save(request);

        updateBookStatus(request.getBookId(), "AVAILABLE");

        BookDto book = fetchBookQuietly(request.getBookId());
        publishEvent("REQUEST_CANCELLED", request, book != null ? book.getTitle() : null);

        return toEnrichedResponse(request, book);
    }

    // -------------------------------------------------------------------------
    // Update return status
    // -------------------------------------------------------------------------

    public BookRequestResponse updateReturnStatus(Long requestId, Long ownerId, UpdateReturnStatusDto dto) {
        BookRequest request = loadRequest(requestId);
        assertReceiver(request, ownerId);
        assertStatus(request, RequestStatus.APPROVED);

        request.setReturnStatus(dto.getReturnStatus());
        request = bookRequestRepository.save(request);

        if (ReturnStatus.RETURNED.equals(dto.getReturnStatus())) {
            updateBookStatus(request.getBookId(), "AVAILABLE");
            BookDto book = fetchBookQuietly(request.getBookId());
            publishEvent("REQUEST_RETURNED", request, book != null ? book.getTitle() : null);
        }

        return toEnrichedResponse(request, fetchBookQuietly(request.getBookId()));
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<BookRequestResponse> getSentRequests(Long userId, RequestStatus status, Pageable pageable) {
        Page<BookRequest> requests = status == null
                ? bookRequestRepository.findBySenderId(userId, pageable)
                : bookRequestRepository.findBySenderIdAndStatus(userId, status, pageable);

        return requests
                .map(r -> toEnrichedResponse(r, fetchBookQuietly(r.getBookId())));
    }

    @Transactional(readOnly = true)
    public Page<BookRequestResponse> getReceivedRequests(Long userId, RequestStatus status, Pageable pageable) {
        Page<BookRequest> requests = status == null
                ? bookRequestRepository.findByReceiverId(userId, pageable)
                : bookRequestRepository.findByReceiverIdAndStatus(userId, status, pageable);

        return requests
                .map(r -> toEnrichedResponse(r, fetchBookQuietly(r.getBookId())));
    }

    @Transactional(readOnly = true)
    public List<ReturnReminderResponse> getRequestsDueSoon() {
        LocalDate reminderDate = LocalDate.now().plusDays(2);
        return bookRequestRepository
                .findByStatusAndReturnStatusAndDueDate(RequestStatus.APPROVED, ReturnStatus.PENDING, reminderDate)
                .stream()
                .map(request -> {
                    BookDto book = fetchBookQuietly(request.getBookId());
                    return ReturnReminderResponse.builder()
                            .requestId(request.getId())
                            .bookId(request.getBookId())
                            .borrowerId(request.getSenderId())
                            .ownerId(request.getReceiverId())
                            .bookTitle(book != null ? book.getTitle() : "your borrowed book")
                            .dueDate(request.getDueDate())
                            .build();
                })
                .toList();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private BookRequest loadRequest(Long requestId) {
        return bookRequestRepository.findById(requestId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Request not found: " + requestId));
    }

    private void assertReceiver(BookRequest request, Long userId) {
        if (!request.getReceiverId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the book owner can perform this action");
        }
    }

    private void assertSender(BookRequest request, Long userId) {
        if (!request.getSenderId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Only the request sender can perform this action");
        }
    }

    private void assertStatus(BookRequest request, RequestStatus expected) {
        if (!expected.equals(request.getStatus())) {
            throw new IllegalStateException(
                    "Request is not in " + expected + " state (current: " + request.getStatus() + ")");
        }
    }

    private void updateBookStatus(Long bookId, String status) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(bookServiceUrl + "/api/books/{id}/status")
                    .queryParam("status", status)
                    .buildAndExpand(bookId)
                    .toUriString();
            restTemplate.patchForObject(url, null, Void.class);
        } catch (Exception e) {
            log.warn("Failed to update book {} status to {}: {}", bookId, status, e.getMessage());
        }
    }

    private BookDto fetchBook(Long bookId) {
        String url = bookServiceUrl + "/api/books/" + bookId;
        ResponseEntity<BookDto> response = restTemplate.getForEntity(url, BookDto.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new jakarta.persistence.EntityNotFoundException("Book not found: " + bookId);
        }
        return response.getBody();
    }

    private BookDto fetchBookQuietly(Long bookId) {
        try {
            return fetchBook(bookId);
        } catch (Exception e) {
            log.warn("Could not fetch book {}: {}", bookId, e.getMessage());
            return null;
        }
    }

    private String normalizeName(String name, Long userId) {
        if (name != null && !name.isBlank()) {
            return name;
        }
        return userId == null ? "User" : "User " + userId;
    }

    private String resolveDisplayName(Long userId, String preferredName, boolean allowIdFallback) {
        // Check if preferredName is a generated placeholder (like "User 2" or "User")
        boolean isGeneratedPlaceholder = preferredName != null
                && (preferredName.matches("^User\\s*\\d*$") || preferredName.equals("User"));

        if (!isGeneratedPlaceholder && preferredName != null && !preferredName.isBlank()) {
            return preferredName;
        }

        UserDto user = fetchUserQuietly(userId);
        if (user != null && user.getName() != null && !user.getName().isBlank()) {
            return user.getName();
        }

        if (allowIdFallback) {
            return normalizeName(preferredName, userId);
        }

        return "Unknown User";
    }

    private void publishEvent(String eventType, BookRequest request, String bookTitle) {
        try {
            BookRequestEvent event = BookRequestEvent.builder()
                    .eventType(eventType)
                    .requestId(request.getId())
                    .bookId(request.getBookId())
                    .senderId(request.getSenderId())
                    .receiverId(request.getReceiverId())
                    .requestType(request.getRequestType())
                    .bookTitle(bookTitle)
                    .timestamp(LocalDateTime.now())
                    .build();
            kafkaTemplate.send(TOPIC, String.valueOf(request.getId()), event);
        } catch (Exception e) {
            log.warn("Failed to publish Kafka event {}: {}", eventType, e.getMessage());
        }
    }

    private BookRequestResponse toResponse(BookRequest r, String senderName,
            String receiverName, String bookTitle, String bookCoverImageUrl) {
        BookRequestResponse res = new BookRequestResponse();
        res.setId(r.getId());
        res.setBookId(r.getBookId());
        res.setSenderId(r.getSenderId());
        res.setReceiverId(r.getReceiverId());
        res.setRequestType(r.getRequestType());
        res.setStatus(r.getStatus());
        res.setNoOfWeeks(r.getNoOfWeeks());
        res.setBorrowDate(r.getBorrowDate());
        res.setDueDate(r.getDueDate());
        res.setReturnStatus(r.getReturnStatus());
        res.setCreatedAt(r.getCreatedAt());
        res.setSenderName(senderName);
        res.setReceiverName(receiverName);
        res.setBookTitle(bookTitle);
        res.setBookCoverImageUrl(bookCoverImageUrl);
        return res;
    }

    private BookRequestResponse toEnrichedResponse(BookRequest request, BookDto book) {
        String senderName = resolveDisplayName(request.getSenderId(), request.getSenderName(), false);
        String receiverName = resolveDisplayName(request.getReceiverId(), request.getReceiverName(), false);
        String bookTitle = book != null && book.getTitle() != null ? book.getTitle() : null;
        String bookCoverImageUrl = book != null ? book.getCoverImageUrl() : null;

        return toResponse(request, senderName, receiverName, bookTitle, bookCoverImageUrl);
    }

    private UserDto fetchUser(Long userId) {
        String url = authServiceUrl + "/api/users/" + userId;
        ResponseEntity<UserDto> response = restTemplate.getForEntity(url, UserDto.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new jakarta.persistence.EntityNotFoundException("User not found: " + userId);
        }
        return response.getBody();
    }

    private UserDto fetchUserQuietly(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            return fetchUser(userId);
        } catch (Exception e) {
            log.warn("Could not fetch user {}: {}", userId, e.getMessage());
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Inner DTO for book-service response
    // -------------------------------------------------------------------------

    @lombok.Data
    static class BookDto {
        private Long id;
        private String title;
        private String status;
        private Long ownerId;
        private String ownerName;
        private String coverImageUrl;
    }

    @lombok.Data
    static class UserDto {
        private Long id;
        private String name;
    }
}
```

## File: book-service/src/main/resources/application.yml

```
server:
  port: 8082

spring:
  application:
    name: book-service

  datasource:
    url: jdbc:mysql://localhost:3307/book_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

  data:
    redis:
      host: localhost
      port: 6379

  cache:
    type: redis
    redis:
      time-to-live: 600000

  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: book-service
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true

app:
  aws:
    bucket-name: ${APP_AWS_BUCKET_NAME:}
    region: ${APP_AWS_REGION:us-east-1}
  audiobook:
    tts:
      api-url: ${APP_AUDIOBOOK_TTS_API_URL:tcp://localhost:10200}
      api-key: ${APP_AUDIOBOOK_TTS_API_KEY:}
      provider: ${APP_AUDIOBOOK_TTS_PROVIDER:piper}
      model: ${APP_AUDIOBOOK_TTS_MODEL:en_US-lessac-medium}
      voice: ${APP_AUDIOBOOK_TTS_VOICE:alloy}
      coqui-speaker-id: ${APP_AUDIOBOOK_TTS_COQUI_SPEAKER_ID:}
      coqui-language-id: ${APP_AUDIOBOOK_TTS_COQUI_LANGUAGE_ID:}
      response-format: ${APP_AUDIOBOOK_TTS_RESPONSE_FORMAT:wav}
      max-chars-per-chunk: ${APP_AUDIOBOOK_TTS_MAX_CHARS_PER_CHUNK:3500}
      max-total-chars: ${APP_AUDIOBOOK_TTS_MAX_TOTAL_CHARS:50000}

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method

management:
  endpoints:
    web:
      exposure:
        include: health,info

logging:
  level:
    com.rebook.book: DEBUG
```

## File: book-service/src/main/resources/application-docker.yml

```
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/book_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
  data:
    redis:
      host: redis
      port: 6379
  kafka:
    bootstrap-servers: kafka:29092

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/

app:
  audiobook:
    tts:
      api-url: ${APP_AUDIOBOOK_TTS_API_URL:tcp://tts:10200}
      api-key: ${APP_AUDIOBOOK_TTS_API_KEY:}
      provider: ${APP_AUDIOBOOK_TTS_PROVIDER:piper}
      model: ${APP_AUDIOBOOK_TTS_MODEL:en_US-lessac-medium}
      voice: ${APP_AUDIOBOOK_TTS_VOICE:alloy}
      coqui-speaker-id: ${APP_AUDIOBOOK_TTS_COQUI_SPEAKER_ID:}
      coqui-language-id: ${APP_AUDIOBOOK_TTS_COQUI_LANGUAGE_ID:}
      response-format: ${APP_AUDIOBOOK_TTS_RESPONSE_FORMAT:wav}
      max-chars-per-chunk: ${APP_AUDIOBOOK_TTS_MAX_CHARS_PER_CHUNK:2000}
      max-total-chars: ${APP_AUDIOBOOK_TTS_MAX_TOTAL_CHARS:12000}
```

## File: book-service/src/main/java/com/rebook/book/config/KafkaConsumerConfig.java

```
package com.rebook.book.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rebook.book.entity.BookStatus;
import com.rebook.book.service.BookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Component
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    private final BookService bookService;
    private final ObjectMapper objectMapper;

    public KafkaConsumerConfig(BookService bookService, ObjectMapper objectMapper) {
        this.bookService = bookService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "request-events", groupId = "book-service")
    public void handleRequestEvent(String message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = objectMapper.readValue(message, Map.class);

            String eventType = (String) event.get("eventType");
            Object bookIdObj = event.get("bookId");

            if (eventType == null || bookIdObj == null) {
                log.warn("Received request-event with missing eventType or bookId: {}", message);
                return;
            }

            Long bookId = Long.valueOf(bookIdObj.toString());

            switch (eventType) {
                case "REQUEST_CREATED" -> bookService.incrementBookPopularity(bookId);
                case "REQUEST_APPROVED" -> bookService.updateBookStatus(bookId, BookStatus.BORROWED);
                case "REQUEST_RETURNED" -> bookService.updateBookStatus(bookId, BookStatus.AVAILABLE);
                default -> log.debug("Ignoring unrecognised request event type: {}", eventType);
            }
        } catch (ResponseStatusException e) {
            log.warn("Book not found while processing event: {} — {}", message, e.getMessage());
        } catch (Exception e) {
            log.error("Failed to process request-event: {}", message, e);
        }
    }
}
```

## File: book-service/src/main/java/com/rebook/book/service/BookService.java

```
package com.rebook.book.service;

import com.rebook.book.dto.response.UserStatsResponse;

import com.rebook.book.dto.request.BookSearchRequest;
import com.rebook.book.dto.request.CreateBookRequest;
import com.rebook.book.dto.request.UpdateBookRequest;
import com.rebook.book.dto.response.BookImageResponse;
import com.rebook.book.dto.response.BookResponse;
import com.rebook.book.entity.Book;
import com.rebook.book.entity.BookCategory;
import com.rebook.book.entity.BookImage;
import com.rebook.book.entity.BookStatus;
import com.rebook.book.mapper.BookMapper;
import com.rebook.book.repository.BookRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional
public class BookService {

    private static final String BOOK_EVENTS_TOPIC = "book-events";
    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    private final BookRepository bookRepository;
    private final BookMapper bookMapper;
    private final S3Service s3Service;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public BookService(BookRepository bookRepository,
            BookMapper bookMapper,
            S3Service s3Service,
            RedisTemplate<String, Object> redisTemplate,
            KafkaTemplate<String, Object> kafkaTemplate) {
        this.bookRepository = bookRepository;
        this.bookMapper = bookMapper;
        this.s3Service = s3Service;
        this.redisTemplate = redisTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public BookResponse createBook(CreateBookRequest request, List<MultipartFile> images, Long ownerId) {
        if (!request.isAtLeastOneModeEnabled()) {
            throw new IllegalArgumentException("At least one of donation or lending must be true");
        }

        Book book = Book.builder()
                .title(request.getTitle())
                .author(request.getAuthor())
                .publisher(request.getPublisher())
                .isbn(request.getIsbn())
                .keywords(request.getKeywords())
                .category(request.getCategory())
                .condition(request.getCondition())
                .city(request.getCity())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .isDonation(request.isDonation())
                .isLending(request.isLending())
                .status(BookStatus.AVAILABLE)
                .ownerId(ownerId)
                .build();

        Book saved = bookRepository.save(book);
        saveImages(saved, images);
        Book updated = bookRepository.save(saved);

        publishBookEvent("BOOK_ADDED", updated.getId(), ownerId);

        return mapResponseWithOrderedImages(updated, null);
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public BookResponse updateBook(Long bookId,
            UpdateBookRequest request,
            List<MultipartFile> newImages,
            Long requesterId) {
        Book book = bookRepository.findWithImagesById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        if (!Objects.equals(book.getOwnerId(), requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owner can update this book");
        }

        bookMapper.updateBookFromRequest(request, book);

        if (request.getIsDonation() != null || request.getIsLending() != null) {
            if (!book.isDonation() && !book.isLending()) {
                throw new IllegalArgumentException("At least one of donation or lending must be true");
            }
        }

        if (newImages != null && !newImages.isEmpty()) {
            deleteAllBookImages(book);
            book.getImages().clear();
            saveImages(book, newImages);
        }

        Book updated = bookRepository.save(book);

        return mapResponseWithOrderedImages(updated, null);
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public void deleteBook(Long bookId, Long requesterId, String requesterRole) {
        Book book = bookRepository.findWithImagesById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        boolean isOwner = Objects.equals(book.getOwnerId(), requesterId);
        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(requesterRole);
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this book");
        }

        deleteAllBookImages(book);
        bookRepository.delete(book);

        publishBookEvent("BOOK_DELETED", bookId, null);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "books:byId", key = "#bookId")
    public BookResponse getBookById(Long bookId) {
        Book book = bookRepository.findWithImagesById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));
        return mapResponseWithOrderedImages(book, null);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "books:popular", key = "'top10'")
    public List<BookResponse> getPopularBooks() {
        Set<Object> topIds = redisTemplate.opsForZSet().reverseRange("books:popularity", 0, 9);
        if (topIds != null && !topIds.isEmpty()) {
            List<Long> bookIds = topIds.stream()
                    .map(id -> Long.parseLong(id.toString()))
                    .collect(Collectors.toList());
            List<Book> books = bookRepository.findAllById(bookIds);
            Map<Long, Book> booksById = books.stream()
                    .collect(Collectors.toMap(Book::getId, b -> b));
            return bookIds.stream()
                    .filter(booksById::containsKey)
                    .map(id -> mapResponseWithOrderedImages(booksById.get(id), null))
                    .collect(Collectors.toList());
        }
        List<Book> fallback = bookRepository.findTop10ByStatusOrderByRequestCountDesc(BookStatus.AVAILABLE);
        List<BookResponse> responses = new ArrayList<>();
        for (Book book : fallback) {
            responses.add(mapResponseWithOrderedImages(book, null));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> searchBooks(BookSearchRequest searchRequest) {
        Pageable pageable = PageRequest.of(
                Math.max(searchRequest.getPage(), 0),
                Math.max(searchRequest.getSize(), 1),
                Sort.by("asc".equalsIgnoreCase(searchRequest.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC,
                        searchRequest.getSortBy()));

        boolean hasGeo = searchRequest.getUserLatitude() != null
                && searchRequest.getUserLongitude() != null
                && searchRequest.getRadiusKm() != null;

        if (hasGeo) {
            return searchBooksWithGeo(searchRequest, pageable);
        }

        Specification<Book> spec = buildSpecification(searchRequest);
        Page<Book> booksPage = bookRepository.findAll(spec, pageable);

        return booksPage.map(book -> mapResponseWithOrderedImages(book, null));
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getBooksByOwner(Long ownerId, Pageable pageable) {
        Page<Book> page = bookRepository.findByOwnerId(ownerId, pageable);
        return page.map(book -> mapResponseWithOrderedImages(book, null));
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getBooksByCategory(BookCategory category, Pageable pageable) {
        Page<Book> page = bookRepository.findByCategoryAndStatus(category, BookStatus.AVAILABLE, pageable);
        List<BookResponse> responses = new ArrayList<>();
        for (Book book : page.getContent()) {
            responses.add(mapResponseWithOrderedImages(book, null));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getRecommendedBooks(Long bookId, int limit) {
        Book baseBook = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        Pageable pageable = PageRequest.of(0, Math.max(limit, 1),
                Sort.by(Sort.Direction.DESC, "requestCount", "createdAt"));

        Page<Book> page = bookRepository.findRecommendations(
                bookId,
                baseBook.getCategory(),
                baseBook.getAuthor(),
                BookStatus.AVAILABLE,
                pageable);

        List<BookResponse> responses = new ArrayList<>();
        for (Book book : page.getContent()) {
            responses.add(mapResponseWithOrderedImages(book, null));
        }
        return responses;
    }

    @CacheEvict(value = { "books:byId", "books:popular", "books:search" }, allEntries = true)
    public void updateBookStatus(Long bookId, BookStatus newStatus) {
        int updated = bookRepository.updateStatus(bookId, newStatus);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found");
        }
    }

    public void incrementBookPopularity(Long bookId) {
        redisTemplate.opsForZSet().incrementScore("books:popularity", bookId.toString(), 1.0);
    }

    private Specification<Book> buildSpecification(BookSearchRequest searchRequest) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("status"), BookStatus.AVAILABLE));

            if (hasText(searchRequest.getKeyword())) {
                String like = "%" + searchRequest.getKeyword().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("author")), like),
                        cb.like(cb.lower(root.get("keywords")), like)));
            }

            if (hasText(searchRequest.getAuthor())) {
                predicates.add(cb.like(cb.lower(root.get("author")),
                        "%" + searchRequest.getAuthor().toLowerCase() + "%"));
            }

            if (hasText(searchRequest.getPublisher())) {
                predicates.add(cb.like(cb.lower(root.get("publisher")),
                        "%" + searchRequest.getPublisher().toLowerCase() + "%"));
            }

            if (hasText(searchRequest.getIsbn())) {
                predicates.add(cb.equal(root.get("isbn"), searchRequest.getIsbn()));
            }

            if (hasText(searchRequest.getCity())) {
                predicates.add(cb.like(cb.lower(root.get("city")),
                        "%" + searchRequest.getCity().toLowerCase() + "%"));
            }

            if (searchRequest.getCategory() != null) {
                predicates.add(cb.equal(root.get("category"), searchRequest.getCategory()));
            }

            if (searchRequest.getCondition() != null) {
                predicates.add(cb.equal(root.get("condition"), searchRequest.getCondition()));
            }

            if (Boolean.TRUE.equals(searchRequest.getIsDonation())) {
                predicates.add(cb.isTrue(root.get("isDonation")));
            }

            if (Boolean.TRUE.equals(searchRequest.getIsLending())) {
                predicates.add(cb.isTrue(root.get("isLending")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Page<BookResponse> searchBooksWithGeo(BookSearchRequest searchRequest, Pageable pageable) {
        List<Object[]> rows = bookRepository.findAvailableBooksWithinRadius(
                searchRequest.getUserLatitude(),
                searchRequest.getUserLongitude(),
                searchRequest.getRadiusKm());

        Map<Long, Double> distanceByBookId = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length == 0 || row[0] == null) {
                continue;
            }
            Long id = ((Number) row[0]).longValue();
            Object distanceObj = row[row.length - 1];
            Double distance = distanceObj instanceof Number ? ((Number) distanceObj).doubleValue() : null;
            distanceByBookId.put(id, distance);
        }

        if (distanceByBookId.isEmpty()) {
            return Page.empty(pageable);
        }

        Map<Long, Book> booksById = new HashMap<>();
        for (Book book : bookRepository.findAllById(distanceByBookId.keySet())) {
            booksById.put(book.getId(), book);
        }

        List<Book> orderedFilteredBooks = distanceByBookId.keySet().stream()
                .map(booksById::get)
                .filter(Objects::nonNull)
                .filter(book -> matchesSearchFilters(book, searchRequest))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), orderedFilteredBooks.size());
        if (start >= orderedFilteredBooks.size()) {
            return new PageImpl<>(List.of(), pageable, orderedFilteredBooks.size());
        }

        List<BookResponse> content = new ArrayList<>();
        for (Book book : orderedFilteredBooks.subList(start, end)) {
            content.add(mapResponseWithOrderedImages(book, distanceByBookId.get(book.getId())));
        }

        return new PageImpl<>(content, pageable, orderedFilteredBooks.size());
    }

    private boolean matchesSearchFilters(Book book, BookSearchRequest req) {
        if (req.getCategory() != null && req.getCategory() != book.getCategory()) {
            return false;
        }
        if (req.getCondition() != null && req.getCondition() != book.getCondition()) {
            return false;
        }
        if (Boolean.TRUE.equals(req.getIsDonation()) && !book.isDonation()) {
            return false;
        }
        if (Boolean.TRUE.equals(req.getIsLending()) && !book.isLending()) {
            return false;
        }
        if (hasText(req.getKeyword())) {
            String keyword = req.getKeyword().toLowerCase();
            boolean keywordMatch = containsIgnoreCase(book.getTitle(), keyword)
                    || containsIgnoreCase(book.getAuthor(), keyword)
                    || containsIgnoreCase(book.getKeywords(), keyword);
            if (!keywordMatch) {
                return false;
            }
        }
        if (hasText(req.getAuthor()) && !containsIgnoreCase(book.getAuthor(), req.getAuthor().toLowerCase())) {
            return false;
        }
        if (hasText(req.getPublisher()) && !containsIgnoreCase(book.getPublisher(), req.getPublisher().toLowerCase())) {
            return false;
        }
        if (hasText(req.getIsbn()) && !Objects.equals(book.getIsbn(), req.getIsbn())) {
            return false;
        }
        if (hasText(req.getCity()) && !containsIgnoreCase(book.getCity(), req.getCity().toLowerCase())) {
            return false;
        }
        return true;
    }

    private BookResponse mapResponseWithOrderedImages(Book book, Double distanceKm) {
        BookResponse response = bookMapper.toResponse(book);
        response.setDistanceKm(distanceKm);

        if (response.getImages() != null) {
            response.getImages().sort(Comparator.comparing(image -> !image.isCover()));
        }

        if ((response.getImageUrls() == null || response.getImageUrls().isEmpty()) && response.getImages() != null) {
            List<String> orderedImageUrls = response.getImages().stream()
                    .map(BookImageResponse::getImageUrl)
                    .filter(this::hasText)
                    .toList();
            response.setImageUrls(orderedImageUrls);
        }

        if (response.getImageUrls() != null && !response.getImageUrls().isEmpty()) {
            response.setCoverImageUrl(response.getImageUrls().get(0));
        }

        return response;
    }

    private void saveImages(Book book, List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return;
        }

        String folder = "books/" + book.getId();
        List<BookImage> bookImages = new ArrayList<>();

        for (int i = 0; i < images.size(); i++) {
            MultipartFile image = images.get(i);
            String imageUrl = s3Service.uploadFile(image, folder);
            if (!hasText(imageUrl)) {
                continue;
            }
            String imageKey = extractS3KeyFromUrl(imageUrl);

            BookImage bookImage = BookImage.builder()
                    .book(book)
                    .imageUrl(imageUrl)
                    .imageKey(imageKey)
                    .isCover(i == 0)
                    .build();
            bookImages.add(bookImage);
        }

        book.getImages().clear();
        book.getImages().addAll(bookImages);
    }

    private void deleteAllBookImages(Book book) {
        if (book.getImages() == null || book.getImages().isEmpty()) {
            return;
        }

        for (BookImage image : book.getImages()) {
            if (hasText(image.getImageKey())) {
                s3Service.deleteFile(image.getImageKey());
            }
        }
    }

    private String extractS3KeyFromUrl(String imageUrl) {
        if (!hasText(imageUrl)) {
            return imageUrl;
        }
        String marker = ".amazonaws.com/";
        int markerIndex = imageUrl.indexOf(marker);
        if (markerIndex == -1) {
            return imageUrl;
        }
        return imageUrl.substring(markerIndex + marker.length());
    }

    private void publishBookEvent(String eventType, Long bookId, Long ownerId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", eventType);
        payload.put("bookId", bookId);
        if (ownerId != null) {
            payload.put("ownerId", ownerId);
        }
        try {
            kafkaTemplate.send(BOOK_EVENTS_TOPIC, payload);
        } catch (RuntimeException ex) {
            log.warn("Failed to publish event {} for book {}", eventType, bookId, ex);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean containsIgnoreCase(String value, String keywordLower) {
        return value != null && value.toLowerCase().contains(keywordLower);
    }

    public UserStatsResponse getUserStats(Long userId) {
        Long donatedCount = bookRepository.countByOwnerIdAndIsDonation(userId, true);
        Long lentCount = bookRepository.countByOwnerIdAndIsLending(userId, true);
        return new UserStatsResponse(
                donatedCount != null ? donatedCount.intValue() : 0,
                lentCount != null ? lentCount.intValue() : 0);
    }
}
```

## File: chat-service/src/main/resources/application.yml

```
server:
  port: 8084

spring:
  application:
    name: chat-service

  datasource:
    url: jdbc:mysql://localhost:3307/chat_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

  kafka:
    bootstrap-servers: localhost:9092

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true

app:
  jwt:
    secret: ${APP_JWT_SECRET:cmVib29rLXNlY3JldC1rZXktMjU2LWJpdHMtbG9uZy1wbGFjZWhvbGRlcg==}

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method

management:
  endpoints:
    web:
      exposure:
        include: health,info

logging:
  level:
    com.rebook.chat: DEBUG
```

## File: chat-service/src/main/resources/application-docker.yml

```
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/chat_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
  kafka:
    bootstrap-servers: kafka:29092

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
```

## File: chat-service/src/main/java/com/rebook/chat/config/KafkaProducerConfig.java

```
package com.rebook.chat.config;

import com.rebook.chat.event.NewMessageEvent;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, NewMessageEvent> chatProducerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, NewMessageEvent> chatKafkaTemplate() {
        return new KafkaTemplate<>(chatProducerFactory());
    }
}
```

## File: chat-service/src/main/java/com/rebook/chat/config/KafkaTopicConfig.java

```
package com.rebook.chat.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic chatEventsTopic() {
        return TopicBuilder.name("chat-events")
                .partitions(1)
                .replicas(1)
                .build();
    }
}
```

## File: chat-service/src/main/java/com/rebook/chat/event/NewMessageEvent.java

```
package com.rebook.chat.event;

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
```

## File: chat-service/src/main/java/com/rebook/chat/service/MessageService.java

```
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
```

## File: notification-service/src/main/resources/application.yml

```
server:
  port: 8085

spring:
  application:
    name: notification-service

  datasource:
    url: jdbc:mysql://localhost:3307/notification_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: notification-service
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.rebook.*"
        spring.json.use.type.headers: false
        spring.json.value.default.type: com.rebook.notification.event.BookRequestEvent

  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true

app:
  auth-service:
    url: http://localhost:8081
  request-service:
    url: http://localhost:8083

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method

management:
  endpoints:
    web:
      exposure:
        include: health,info
  health:
    mail:
      enabled: false
```

## File: notification-service/src/main/resources/application-docker.yml

```
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/notification_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
  kafka:
    bootstrap-servers: kafka:29092
  mail:
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/

app:
  auth-service:
    url: http://auth-service
```

## File: notification-service/src/main/java/com/rebook/notification/config/KafkaChatConsumerConfig.java

```
package com.rebook.notification.config;

import com.rebook.notification.event.NewMessageEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaChatConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, NewMessageEvent> chatConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "notification-service-chat");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.rebook.*");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, NewMessageEvent.class);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, NewMessageEvent> chatKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, NewMessageEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(chatConsumerFactory());
        return factory;
    }
}
```

## File: notification-service/src/main/java/com/rebook/notification/consumer/RequestEventConsumer.java

```
package com.rebook.notification.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.event.BookRequestEvent;
import com.rebook.notification.service.NotificationService;
import com.rebook.notification.service.UserLookupService.UserInfo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class RequestEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "request-events", groupId = "notification-service")
    public void consume(BookRequestEvent event) {
        if (event == null || event.getEventType() == null) {
            log.warn("Received null or invalid request event payload");
            return;
        }

        log.info("Received request event: {} for request {}", event.getEventType(), event.getRequestId());

        try {
            switch (event.getEventType()) {
                case "REQUEST_CREATED" -> handleRequestCreated(event);
                case "REQUEST_APPROVED" -> handleRequestApproved(event);
                case "REQUEST_REJECTED" -> handleRequestRejected(event);
                case "REQUEST_RETURNED" -> handleRequestReturned(event);
                case "REQUEST_CANCELLED" -> handleRequestCancelled(event);
                default -> log.warn("Unhandled request event type: {}", event.getEventType());
            }
        } catch (Exception exception) {
            log.error("Failed to process request event {} for request {}: {}",
                    event.getEventType(), event.getRequestId(), exception.getMessage(), exception);
        }
    }

    private void handleRequestCreated(BookRequestEvent event) {
        UserInfo owner = safeGetUser(event.getReceiverId());
        UserInfo sender = safeGetUser(event.getSenderId());

        String title = "New book request";
        String senderName = sender != null ? sender.name() : fallbackName(event.getSenderId());
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = senderName + " requested " + bookTitle + ".";

        notificationService.createNotification(event.getReceiverId(), title, message, NotificationType.REQUEST_RECEIVED,
                event.getRequestId());

        if (owner != null && sender != null && owner.email() != null && !owner.email().isBlank()) {
            notificationService.emailService().sendRequestCreatedEmail(owner.email(), owner.name(), bookTitle,
                    sender.name());
        }
    }

    private void handleRequestApproved(BookRequestEvent event) {
        UserInfo sender = safeGetUser(event.getSenderId());

        String title = "Request approved";
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "Your request for " + bookTitle + " was approved.";

        notificationService.createNotification(event.getSenderId(), title, message, NotificationType.REQUEST_APPROVED,
                event.getRequestId());

        if (sender != null && sender.email() != null && !sender.email().isBlank()) {
            notificationService.emailService().sendRequestApprovedEmail(sender.email(), sender.name(),
                    bookTitle);
        }
    }

    private void handleRequestRejected(BookRequestEvent event) {
        UserInfo sender = safeGetUser(event.getSenderId());

        String title = "Request rejected";
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "Your request for " + bookTitle + " was not approved.";

        notificationService.createNotification(event.getSenderId(), title, message, NotificationType.REQUEST_REJECTED,
                event.getRequestId());

        if (sender != null && sender.email() != null && !sender.email().isBlank()) {
            notificationService.emailService().sendRequestRejectedEmail(sender.email(), sender.name(),
                    bookTitle);
        }
    }

    private void handleRequestReturned(BookRequestEvent event) {
        UserInfo owner = safeGetUser(event.getReceiverId());

        String title = "Book returned";
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "Your book " + bookTitle + " has been marked as returned.";

        notificationService.createNotification(event.getReceiverId(), title, message, NotificationType.REQUEST_RETURNED,
                event.getRequestId());

        if (owner != null && owner.email() != null && !owner.email().isBlank()) {
            notificationService.emailService().sendRequestReturnedEmail(owner.email(), owner.name(), bookTitle);
        }
    }

    private void handleRequestCancelled(BookRequestEvent event) {
        String bookTitle = fallbackBookTitle(event.getBookTitle());
        String message = "The request for " + bookTitle + " was cancelled by the requester.";

        notificationService.createNotification(event.getReceiverId(), "Request cancelled", message,
                NotificationType.SYSTEM,
                event.getRequestId());
        log.info("Request {} was cancelled by sender {}", event.getRequestId(), event.getSenderId());
    }

    private UserInfo safeGetUser(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            return notificationService.userLookupService().getUserById(userId);
        } catch (Exception exception) {
            log.warn("Could not fetch user {} for notification enrichment: {}", userId, exception.getMessage());
            return null;
        }
    }

    private String fallbackName(Long userId) {
        return userId == null ? "Someone" : "User #" + userId;
    }

    private String fallbackBookTitle(String bookTitle) {
        if (bookTitle != null && !bookTitle.isBlank()) {
            return bookTitle;
        }
        return "your book";
    }
}
```

## File: notification-service/src/main/java/com/rebook/notification/consumer/ChatEventConsumer.java

```
package com.rebook.notification.consumer;

import com.rebook.notification.entity.NotificationType;
import com.rebook.notification.event.NewMessageEvent;
import com.rebook.notification.service.NotificationService;
import com.rebook.notification.service.UserLookupService.UserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "chat-events", groupId = "notification-service-chat", containerFactory = "chatKafkaListenerContainerFactory")
    public void consume(NewMessageEvent event) {
        if (event == null || event.getReceiverId() == null) {
            log.warn("Received null or invalid chat event");
            return;
        }

        log.info("Received chat event: message {} from sender {} to receiver {}",
                event.getMessageId(), event.getSenderId(), event.getReceiverId());

        try {
            String senderName = event.getSenderName();
            if (senderName == null || senderName.isBlank()) {
                try {
                    UserInfo sender = notificationService.userLookupService().getUserById(event.getSenderId());
                    senderName = sender.name();
                } catch (Exception e) {
                    log.warn("Could not look up sender name for {}: {}", event.getSenderId(), e.getMessage());
                    senderName = "Someone";
                }
            }

            String preview = event.getContent();
            if (preview != null && preview.length() > 60) {
                preview = preview.substring(0, 60) + "…";
            }

            notificationService.createNotification(
                    event.getReceiverId(),
                    "New message from " + senderName,
                    preview != null ? preview : "(no content)",
                    NotificationType.NEW_MESSAGE,
                    event.getRequestId());
        } catch (Exception e) {
            log.error("Failed to process chat event for message {}: {}", event.getMessageId(), e.getMessage(), e);
        }
    }
}
```

## File: notification-service/src/main/java/com/rebook/notification/event/BookRequestEvent.java

```
package com.rebook.notification.event;

import java.time.LocalDateTime;

import com.rebook.notification.entity.RequestType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
```

## File: notification-service/src/main/java/com/rebook/notification/event/NewMessageEvent.java

```
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
```


