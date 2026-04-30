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

### RAG Service

- RAG functionality removed in this branch. See `main` branch for RAG-specific architecture.

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

- (RAG removed in this branch)

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
<!-- RAG datastore removed in this branch -->

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
 - (RAG removed in this branch)

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

- `mysql_data`, `redis_data`, `kafka_data`, `piper_data`.

### Health Checks

- Core services include actuator-based health checks.
 - mysql/redis/kafka use protocol-specific checks.

### EC2 Topology

Deployment pipeline targets two EC2 environments:

1. Main EC2: frontend, gateway, eureka, auth, book, request, chat, notification, mysql, redis, kafka stack.
2. Separate RAG EC2: (RAG deployment removed in this branch)

### S3 Image Storage Pattern

- book-service uploads images to S3 through `S3Service`.
- images are grouped by `books/{bookId}` folder prefix.
- stored metadata includes URL + object key for deletion.

### Redis Caching

- Spring cache manager stores selected book query caches.
- ZSET `books:popularity` tracks request-driven popularity scores.
