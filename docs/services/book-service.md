# Book Service

## Responsibility

Book Service owns book catalog operations: CRUD, media upload to S3, search/filtering, recommendation retrieval, popularity tracking, and audiobook conversion pipeline.

## Port

- `8082` internal (routed via Gateway)

## Key Dependencies

- MySQL (`book_db`)
- AWS S3
- Redis cache + ZSET popularity
- Kafka producer (`book-events`)
- Kafka consumer (`request-events`) for status-driven updates
- TTS endpoint (`APP_AUDIOBOOK_TTS_API_URL`)

## Configuration

Important keys:

- `app.aws.bucket-name`
- `app.aws.region`
- `spring.data.redis.host/port`
- `spring.cache.redis.time-to-live`
- `app.audiobook.tts.*` family

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/books` | Yes | Create book with optional images |
| GET | `/api/books/{id}` | No | Get single book |
| PUT | `/api/books/{id}` | Yes | Update book and optionally replace images |
| DELETE | `/api/books/{id}` | Yes | Delete by owner or admin |
| GET | `/api/books/search` | No | Search books with filters/geo |
| GET | `/api/books/my` | Yes | List caller-owned books |
| GET | `/api/books/popular` | No | Top popular books |
| PATCH | `/api/books/{id}/status` | Yes | Update status (`AVAILABLE/REQUESTED/BORROWED`) |
| GET | `/api/books/users/{userId}/stats` | No | User donated/lent counts |
| POST | `/api/books/study-material/audiobook` | Yes | Convert uploaded file to audiobook |
| GET | `/api/recommendations/{bookId}` | No | Similar/recommended books |

## Key Classes

- `BookController`: public/private catalog API.
- `RecommendationController`: recommendations endpoint.
- `BookService`: core domain logic + event publishing.
- `S3Service`: upload/delete media objects.
- `StudyMaterialAudioService`: file-to-audio conversion.
- `Book` + `BookImage`: JPA entities.
- `BookRepository`: specifications + custom geo queries.

## Kafka

- Produces `book-events` with payload `{eventType, bookId, ownerId?}`.
- Consumes `request-events` (via `KafkaConsumerConfig`) to react to request lifecycle.

## Security Notes

- Gateway enforces auth for mutations.
- Delete action further checks owner/admin role logic inside service.
- S3 credentials should be provided via IAM role in production where possible.
