# Kitabi — Community Book Sharing Platform

Kitabi is a production-oriented microservices platform for community book sharing, borrowing, and knowledge access. Users can register, list books for donation/lending, send and manage borrowing requests, chat in real time, receive notifications, and use a Retrieval-Augmented Generation (RAG) assistant for document Q&A. The system is designed around service isolation (Auth, Books, Requests, Chat, Notifications, Gateway, Eureka, RAG), event-driven workflows via Kafka, and containerized deployment with Docker Compose and GitHub Actions CI/CD.

## Live Demo

- Web: `http://<your-host>/`
- API Gateway: `http://<your-host>:8080`

## Architecture Overview

```text
                               +---------------------+
                               |   React Frontend    |
                               |      :80/:443       |
                               +----------+----------+
                                          |
                                          v
                               +---------------------+
                               |     API Gateway     |
                               |       :8080         |
                               +----------+----------+
                                          |
        +----------------------+----------+----------+----------------------+
        |                      |                     |                      |
        v                      v                     v                      v
+---------------+     +---------------+     +---------------+      +---------------+
| Auth Service  |     | Book Service  |     |Request Service|      | Chat Service  |
|    :8081      |     |    :8082      |     |    :8083      |      |    :8084      |
+-------+-------+     +-------+-------+     +-------+-------+      +-------+-------+
        |                     |                     |                      |
        |                     |                     |                      |
        +----------+----------+---------------------+----------------------+
                   |                                 
                   v
           +---------------+     +-----------------------+
           |     Kafka     |<--->| Notification Service  |
           |  :9092 / UI   |     |         :8085         |
           +-------+-------+     +-----------+-----------+
                   |                           |
                   |                           v
                   |                     SMTP (Gmail/SES)
                   |
        +----------+-----------+
        |                      |
        v                      v
+---------------+      +---------------+
|    MySQL      |      |    Redis      |
|    :3307      |      |    :6379      |
+---------------+      +---------------+

+---------------------+           +--------------------+
|  Eureka Server      |<----------|  All Spring Svcs   |
|      :8761          |  discovery|  register here     |
+---------------------+           +--------------------+

+---------------------+      +------------------------+
|   RAG Service :8086 |<---->| Postgres + pgvector    |
+----------+----------+      |      rag-postgres       |
           |                 +-------------------------+
           v
      Ollama (primary/fallback endpoint)
```

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite + React Router + TanStack Query | SPA, routing, API state management |
| API Edge | Spring Cloud Gateway | Single entry point, JWT validation, header propagation |
| Service Discovery | Eureka Server | Dynamic service registration and routing |
| Auth | Spring Boot + Spring Security + JWT | Registration, login, refresh token, profile/admin controls |
| Catalog | Spring Boot + JPA + AWS S3 + Redis | Book CRUD/search/media storage/caching |
| Requests | Spring Boot + JPA + Kafka | Borrow/donation workflow and lifecycle transitions |
| Chat | Spring Boot + WebSocket + Kafka | Request-scoped messaging and chat events |
| Notifications | Spring Boot + Kafka + JavaMail | In-app + email notifications |
| AI/RAG | Spring Boot + pgvector + Ollama | Document upload and contextual Q&A |
| Messaging | Apache Kafka + Zookeeper | Asynchronous event backbone |
| Datastores | MySQL + Redis + Postgres(pgvector) | Transactional, cache, vector search |
| Infra | Docker Compose | Local/runtime orchestration |
| CI/CD | GitHub Actions + Docker Hub + EC2 SSH deploy | Build/test/push/deploy automation |

## Quick Start

### 1) Prerequisites

- Docker Engine 24+
- Docker Compose v2
- (Optional local dev) Java 17, Maven 3.9+, Node 20+

### 2) Configure environment

Create or update `.env` in repo root:

```bash
APP_JWT_SECRET=<base64-256-bit-secret>
MYSQL_ROOT_PASSWORD=root
MAIL_USERNAME=<smtp-username>
MAIL_PASSWORD=<smtp-password>
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
APP_AWS_BUCKET_NAME=<bucket>
APP_AWS_REGION=ap-south-1
APP_AUDIOBOOK_TTS_API_KEY=<optional>
APP_OLLAMA_PRIMARY_BASE_URL=<optional>
APP_OLLAMA_FALLBACK_BASE_URL=http://host.docker.internal:11434
APP_OLLAMA_ENABLE_FALLBACK=true
APP_OLLAMA_CHAT_MODEL=gemma:2b
APP_OLLAMA_EMBEDDING_MODEL=nomic-embed-text
APP_OLLAMA_REQUEST_TIMEOUT_SECONDS=180
```

### 3) Start all services

```bash
docker compose up -d --build
```

### 4) Verify

```bash
docker compose ps
```

Core URLs:

- Frontend: `http://localhost`
- Gateway: `http://localhost:8080`
- Eureka: `http://localhost:8761`
- Kafka UI: `http://localhost:8090`
- Chat Service: `http://localhost:8084`
- Notification Service: `http://localhost:8085`
- RAG Service: `http://localhost:8086`

## Services

| Service | Port | Responsibility |
|---|---|---|
| frontend | 80/443 | React SPA, user interactions |
| api-gateway | 8080 | JWT auth filter, route dispatch to services |
| eureka-server | 8761 | Service registry |
| auth-service | 8081 | Identity, JWT issuance/refresh, profile/admin |
| book-service | 8082 | Book inventory, media upload, search/recommendations |
| request-service | 8083 | Request lifecycle and review workflow |
| chat-service | 8084 | Request-based chat + websocket |
| notification-service | 8085 | Notification feed + email from Kafka events |
| rag-service | 8086 | Document ingestion and RAG chat |
| mysql | 3307->3306 | Main relational DB for core services |
| redis | 6379 | Cache/popularity counters |
| kafka | 9092 | Event bus |
| kafka-ui | 8090 | Kafka inspection |
| zookeeper | 2181 | Kafka coordination |
| rag-postgres | 5544->5432 | Vector store for RAG |
| tts (piper) | 10200 | Text-to-speech for audiobook conversion |

## Features

### Auth

- Register/login with JWT access + refresh tokens
- Refresh token endpoint for silent session renewal
- Profile update with geo coordinates
- Admin operations: list users, ban/unban, delete users

### Books

- Create/update/delete books with multipart image upload
- Donation and lending modes
- Search and filter by keyword, location, category, condition
- Popular books and recommendation endpoint
- Study-material to audiobook conversion endpoint

### Requests

- Create donation/lending requests
- Owner approval/rejection, requester cancellation
- Return status tracking for lending requests
- Due-soon reminder query endpoint
- User-to-user rating/review after request completion

### Chat

- REST chat APIs by request ID
- WebSocket message channel (`/topic/requests/{requestId}`)
- Inbox with unread counters and read-status updates
- Kafka chat event emission for notification fanout

### Notifications

- In-app paginated notification feed
- Unread count, mark-as-read, mark-all-read
- Kafka consumers for request and chat events
- Email notifications for major request events

### Frontend

- Public and protected route model
- Admin-only routes via `ProtectedRoute(requireAdmin)`
- TanStack Query for cache/invalidation
- Axios interceptors for auth and auto refresh-token flow

## Project Structure

```text
rebook-system/
├─ api-gateway/
├─ auth-service/
├─ book-service/
├─ request-service/
├─ chat-service/
├─ notification-service/
├─ eureka-server/
├─ rag-service/
├─ frontend/
├─ docker/
│  └─ mysql/init.sql
├─ scripts/
│  └─ setup-ec2.sh
├─ .github/workflows/
│  ├─ pr-check.yml
│  └─ deploy.yml
├─ docker-compose.yml
├─ docker-compose.rag.yml
└─ docs/
   ├─ architecture.md
   ├─ api-reference.md
   ├─ setup.md
   ├─ deployment.md
   ├─ frontend.md
   └─ services/
      ├─ api-gateway.md
      ├─ auth-service.md
      ├─ book-service.md
      ├─ request-service.md
      └─ notification-service.md
```

## CI/CD

- Pull requests to `main`/`develop` run full Java+Frontend build tests.
- Push to `main` triggers image build/push to Docker Hub and EC2 deployment.
- Deployment is split:
  - Main EC2: gateway + core services + frontend
  - RAG EC2: rag-service + rag-postgres

## API Surface Summary

### Auth Domain

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/{id}`
- `GET /api/admin/users`
- `PUT /api/admin/users/{id}/ban`
- `PUT /api/admin/users/{id}/unban`
- `DELETE /api/admin/users/{id}`

### Book Domain

- `POST /api/books` (multipart)
- `GET /api/books/{id}`
- `PUT /api/books/{id}` (multipart)
- `DELETE /api/books/{id}`
- `GET /api/books/search`
- `GET /api/books/my`
- `GET /api/books/popular`
- `PATCH /api/books/{id}/status`
- `GET /api/books/users/{userId}/stats`
- `POST /api/books/study-material/audiobook` (multipart)
- `GET /api/recommendations/{bookId}`

### Request Domain

- `POST /api/requests`
- `GET /api/requests/sent`
- `GET /api/requests/received`
- `PUT /api/requests/{id}/approve`
- `PUT /api/requests/{id}/reject`
- `PUT /api/requests/{id}/cancel`
- `PUT /api/requests/{id}/return-status`
- `GET /api/requests/overdue-soon`
- `POST /api/reviews`
- `GET /api/reviews/user/{userId}`

### Chat Domain

- `POST /api/messages`
- `GET /api/messages/{requestId}`
- `GET /api/messages/inbox`
- `PUT /api/messages/{requestId}/read`
- websocket mapping `/app/chat.send`

### Notification Domain

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PUT /api/notifications/{id}/read`
- `PUT /api/notifications/read-all`

### RAG Domain

- `POST /api/rag/documents/upload`
- `GET /api/rag/documents`
- `DELETE /api/rag/documents/{id}`
- `POST /api/rag/chat`

## Kafka Event Map

| Topic | Produced By | Consumed By | Event Types |
|---|---|---|---|
| `request-events` | request-service | notification-service, book-service | `REQUEST_CREATED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_CANCELLED`, `REQUEST_RETURNED` |
| `chat-events` | chat-service | notification-service | new message events |
| `book-events` | book-service | none currently | `BOOK_ADDED`, `BOOK_DELETED` |

## Request Lifecycle (Detailed)

### Create

1. User creates request via frontend modal.
2. Gateway verifies JWT and forwards request to request-service.
3. request-service validates book availability and sender ownership constraints.
4. Request row is stored in `PENDING` state.
5. book-service status is patched to `REQUESTED`.
6. `REQUEST_CREATED` event is published.
7. notification-service creates owner notification and optional email.

### Approve

1. Owner approves from incoming requests screen.
2. request-service transitions `PENDING -> APPROVED`.
3. lending requests calculate `borrowDate` and `dueDate`.
4. book status transitions to `BORROWED`.
5. `REQUEST_APPROVED` event is published.

### Reject

1. Owner rejects pending request.
2. request-service transitions `PENDING -> REJECTED`.
3. book status transitions back to `AVAILABLE`.
4. `REQUEST_REJECTED` event is published.

### Cancel

1. Sender cancels own pending request.
2. request-service transitions `PENDING -> CANCELLED`.
3. book status transitions back to `AVAILABLE`.
4. `REQUEST_CANCELLED` event is published.

### Return

1. Owner updates return status for approved lending request.
2. on `RETURNED`, book status transitions back to `AVAILABLE`.
3. `REQUEST_RETURNED` event is published.

## JWT and Header Propagation

JWT claim usage:

- `sub` for user id
- `email`
- `name`
- `role`

Gateway forwards:

- `X-User-Id`
- `X-User-Name`
- `X-User-Roles`

These headers are used by downstream services for ownership checks and business authorization.

## Frontend Route Matrix

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Home/discovery |
| `/login` | Public | Sign in |
| `/register` | Public | Sign up |
| `/books` | Public | Catalog search and filter |
| `/books/:id` | Public | Book detail |
| `/books/add` | Public route | Add book listing UI |
| `/books/edit/:id` | Protected | Edit listing |
| `/books/audiobook` | Protected | Audiobook generation |
| `/my-books` | Protected | Owner listing management |
| `/requests/sent` | Protected | Sent requests |
| `/requests/received` | Protected | Received requests |
| `/chat` | Protected | Chat inbox shell |
| `/chat/:requestId` | Protected | Chat window |
| `/notifications` | Protected | Notification center |
| `/profile` | Protected | Own profile |
| `/users/:userId` | Protected | Other user profile |
| `/rag` | Protected | RAG docs and chat |
| `/admin` | Admin | Admin dashboard |
| `/admin/users` | Admin | User moderation |

## Ops Checklist

Before start:

1. confirm `.env` values for JWT, AWS, mail.
2. confirm Docker daemon is running.
3. confirm ports 80/443/8080-8086/8761/9092/6379/3307 are free.

After start:

1. check `docker compose ps` health statuses.
2. check gateway and eureka health endpoints.
3. validate login and token refresh.
4. create request and verify notification appears.
5. send chat message and verify unread counter updates.

## Troubleshooting Commands

```bash
docker compose ps
docker compose logs -f --tail=200 api-gateway auth-service request-service notification-service
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
docker compose exec mysql mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SHOW DATABASES;"
curl http://localhost:8761/actuator/health
curl http://localhost:8080/actuator/health
```

## Support Matrix

| Area | Status |
|---|---|
| Docker local development | Supported |
| GitHub Actions CI/CD | Supported |
| Multi-instance split deployment (core + RAG) | Supported |
| Single-process monolith mode | Not applicable |

## Service-to-Data Mapping

| Service | Primary DB | Tables/Collections | Secondary Stores |
|---|---|---|---|
| auth-service | MySQL `auth_db` | `users` | none |
| book-service | MySQL `book_db` | `books`, `book_images` | Redis, S3 |
| request-service | MySQL `request_db` | `book_requests`, `reviews` | Kafka |
| chat-service | MySQL `chat_db` | `messages` | Kafka, WebSocket sessions |
| notification-service | MySQL `notification_db` | `notifications` | Kafka, SMTP |
| rag-service | Postgres `ragdb` | documents/chunks/messages (JPA models) | Ollama |

## Deployment Topologies

### Local single-machine

- All services run on a single Docker host.
- Suitable for development and demos.
- Uses default bridge networking and local volumes.

### Split production topology

- Main EC2 hosts core transactional services.
- Separate RAG EC2 hosts vector and LLM-facing stack.
- Cross-instance discovery configured via `EUREKA_DEFAULT_ZONE`.

### Why split RAG?

- RAG workloads are memory/CPU intensive and model-dependent.
- Isolation protects transactional service latency under AI load.
- Independent scaling and rollout cadence for RAG path.

## Security Hardening Checklist

1. rotate JWT secret periodically.
2. use IAM roles for AWS access; avoid long-lived static keys.
3. lock CORS allowed origins to frontend domain(s).
4. enforce HTTPS termination for all public endpoints.
5. disable debug logging in production.
6. configure branch protections requiring PR checks.
7. keep Docker host patched and minimal.

## Performance Notes

- Redis-backed popularity ZSET prevents expensive ranking scans.
- TanStack Query reduces duplicate client network calls.
- Gateway centralizes auth checks and removes repeated validation code per service.
- Kafka decouples notification/chat side effects from transaction completion paths.

## Suggested Smoke Test Script

```bash
# 1) auth
curl -X POST http://localhost:8080/api/auth/register -H "Content-Type: application/json" -d '{"name":"demo","email":"demo@example.com","password":"demo123"}'

# 2) login
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@example.com","password":"demo123"}'

# 3) health checks
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health
curl http://localhost:8084/actuator/health
curl http://localhost:8085/actuator/health
curl http://localhost:8086/actuator/health
```

## License

MIT
