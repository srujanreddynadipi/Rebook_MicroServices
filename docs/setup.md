# Local Setup

## Prerequisites

- Java 17 (Temurin/OpenJDK)
- Maven 3.9+
- Node.js 20+
- npm 10+
- Docker 24+
- Docker Compose v2

## Environment Variables

Root `.env` is consumed by `docker-compose.yml`.

| Variable | Example Value | Description |
|---|---|---|
| `APP_JWT_SECRET` | `base64-256-bit-secret` | JWT signing secret used by gateway/auth/chat/rag |
| `MYSQL_ROOT_PASSWORD` | `root` | MySQL root password for container bootstrap |
| `MAIL_USERNAME` | `sender@example.com` | SMTP username for notification-service |
| `MAIL_PASSWORD` | `app-password` | SMTP password for notification-service |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS credentials for S3 uploads in book-service |
| `AWS_SECRET_ACCESS_KEY` | `...` | AWS secret for S3 |
| `AWS_SESSION_TOKEN` | `<optional>` | Optional STS session token |
| `APP_AWS_BUCKET_NAME` | `rebook-images-bucket` | S3 bucket for book images |
| `APP_AWS_REGION` | `ap-south-1` | AWS region for S3 client |
| `APP_AUDIOBOOK_TTS_API_URL` | `tcp://tts:10200` | Piper/Coqui/OpenAI TTS endpoint |
| `APP_AUDIOBOOK_TTS_API_KEY` | `<optional>` | API key if provider requires it |
| `APP_AUDIOBOOK_TTS_PROVIDER` | `piper` | TTS provider identifier |
| `APP_AUDIOBOOK_TTS_MODEL` | `en_US-lessac-medium` | Voice model id |
| `APP_AUDIOBOOK_TTS_VOICE` | `alloy` | Voice profile |
| `APP_AUDIOBOOK_TTS_COQUI_SPEAKER_ID` | `<optional>` | Coqui speaker id |
| `APP_AUDIOBOOK_TTS_COQUI_LANGUAGE_ID` | `<optional>` | Coqui language id |
| `APP_AUDIOBOOK_TTS_RESPONSE_FORMAT` | `wav` | Audio format |
| `APP_AUDIOBOOK_TTS_MAX_CHARS_PER_CHUNK` | `2000` | Chunk size cap |
| `APP_AUDIOBOOK_TTS_MAX_TOTAL_CHARS` | `12000` | Request total cap |
| `PUID` | `1000` | Piper container user id |
| `PGID` | `1000` | Piper container group id |
| `TZ` | `Etc/UTC` | Piper timezone |
| `APP_OLLAMA_PRIMARY_BASE_URL` | `http://<ollama>:11434` | Preferred Ollama base URL |
| `APP_OLLAMA_FALLBACK_BASE_URL` | `http://host.docker.internal:11434` | Fallback Ollama URL |
| `APP_OLLAMA_ENABLE_FALLBACK` | `true` | Enable fallback routing |
| `APP_OLLAMA_CHAT_MODEL` | `gemma:2b` | LLM model |
| `APP_OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model |
| `APP_OLLAMA_REQUEST_TIMEOUT_SECONDS` | `180` | Ollama request timeout |
| `SPRING_AI_OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Spring AI Ollama base URL |
| `SPRING_AI_OLLAMA_CHAT_MODEL` | `gemma:2b` | Spring AI chat model |
| `SPRING_AI_OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Spring AI embedding model |

## Start with Docker Compose (Recommended)

### 1) Build and launch

```bash
docker compose up -d --build
```

### 2) Watch startup

```bash
docker compose ps
docker compose logs -f --tail=100
```

### 3) Verify health

```bash
curl http://localhost:8761/actuator/health
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health
curl http://localhost:8084/actuator/health
curl http://localhost:8085/actuator/health
curl http://localhost:8086/actuator/health
```

### 4) Access URLs

- Frontend: `http://localhost`
- Gateway: `http://localhost:8080`
- Eureka: `http://localhost:8761`
- Kafka UI: `http://localhost:8090`
- MySQL mapped port: `3307`
- Redis: `6379`
- Kafka: `9092`

## Run Services Individually (Development)

### Backend services

Run each service from its folder:

```bash
mvn spring-boot:run
```

Recommended startup order:

1. eureka-server
2. auth-service
3. book-service
4. request-service
5. chat-service
6. notification-service
7. api-gateway
8. rag-service (if Ollama + rag-postgres are available)

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Default Vite dev URL:

- `http://localhost:5173`

## Common Issues and Fixes

### 1) Eureka references `localhost` from containers

Symptoms: gateway/service cannot locate peers in Docker.

Fix:

- Use docker profile or container hostnames for service URLs.
- Ensure services are on `rebook-network` and register with reachable Eureka endpoint.

### 2) JWT secret missing or weak

Symptoms: 401 on all protected routes, token parse errors.

Fix:

```bash
# generate a strong base64 string
openssl rand -base64 32
```

Set value in `.env` as `APP_JWT_SECRET` and restart gateway/auth/chat/rag.

### 3) SMTP failures in notification-service

Symptoms: email errors while in-app notifications still work.

Fix:

- Provide valid `MAIL_USERNAME` and `MAIL_PASSWORD`.
- Use app password for Gmail.
- Confirm provider allows SMTP from your environment.

### 4) S3 image upload failures

Symptoms: book creation fails with image upload errors.

Fix:

- Validate AWS credentials and region.
- Validate bucket name and IAM permissions (`s3:PutObject`, `s3:DeleteObject`, `s3:GetObject`).

### 5) Docker disk pressure on EC2/local

Symptoms: pull/build fails, no space left.

Fix:

```bash
docker image prune -f
docker builder prune -f --filter "until=24h"
docker volume prune -f
```

### 6) Kafka consumer not receiving events

Symptoms: requests/chats created but no notifications.

Fix:

- Verify `kafka` and `zookeeper` are healthy.
- Confirm topics exist: `request-events`, `chat-events`, `book-events`.
- Check consumer group logs for deserialization errors.

### 7) RAG service cannot reach Ollama

Symptoms: `/api/rag/chat` timeout/fail.

Fix:

- Configure `APP_OLLAMA_PRIMARY_BASE_URL` or fallback URL.
- Ensure Ollama model names match configured values.
- Increase `APP_OLLAMA_REQUEST_TIMEOUT_SECONDS` if needed.
