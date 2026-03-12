# ReBook Book Service

Book Service manages book listings, image uploads, search, popularity, and recommendations in the ReBook microservices system.

## Service Overview

- Service name: `book-service`
- Port: `8082`
- Java: `17`
- Framework: `Spring Boot 3.1.12`
- Build tool: `Maven`
- Discovery: `Eureka Client`
- API docs: `springdoc-openapi` (`/api-docs`, `/swagger-ui.html`)

## Core Features

- Create, update, delete, and read books
- Book image upload and delete via AWS S3
- Filtered search with pagination and sorting
- Geo-based search using Haversine distance
- Popular books (cached)
- Recommendations (same category or same author)
- Kafka book events for cross-service integration

## Data Model

### Book

Main fields:
- `id`, `title`, `author`, `publisher`, `isbn`, `keywords`
- `category`, `condition`, `status`
- `city`, `latitude`, `longitude`
- `isDonation`, `isLending`
- `ownerId`, `requestCount`, `createdAt`
- `images` (`BookImage` list)

### BookImage

- `id`, `imageUrl`, `imageKey`, `isCover`
- linked to `Book`

### Enums

- `BookCategory`: ENGINEERING, MEDICAL, NOVELS, SCHOOL, COMPETITIVE_EXAMS, SELF_HELP, STORY_BOOKS, HISTORY, LANGUAGE, OTHER
- `BookCondition`: NEW, USED_GOOD, USED_OLD
- `BookStatus`: AVAILABLE, REQUESTED, BORROWED

## Configuration

From `application.yml`:

- `server.port=8082`
- `spring.application.name=book-service`
- MySQL schema: `book_db`
- Redis cache enabled (`spring.cache.type=redis`, TTL `600000 ms`)
- Kafka bootstrap server: `localhost:9092`
- AWS settings:
  - `app.aws.bucket-name` from `APP_AWS_BUCKET_NAME`
  - `app.aws.region` from `APP_AWS_REGION`

## API Endpoints

Base URL: `/api/books`

1. `POST /api/books` (multipart/form-data)
- Parts:
  - `bookRequest` (CreateBookRequest JSON)
  - `images` (optional, repeated MultipartFile)
- Required header: `X-User-Id`
- Response: `201 Created` with `BookResponse`

2. `GET /api/books/{id}`
- Response: `200 OK` with `BookResponse`

3. `PUT /api/books/{id}` (multipart/form-data)
- Parts:
  - `bookRequest` (UpdateBookRequest JSON)
  - `images` (optional replacement images)
- Required header: `X-User-Id`
- Response: `200 OK` with `BookResponse`

4. `DELETE /api/books/{id}`
- Required headers:
  - `X-User-Id`
  - `X-User-Roles`
- Owner or `ROLE_ADMIN` can delete
- Response: `204 No Content`

5. `GET /api/books/search`
- Query params mapped to `BookSearchRequest`
- Supports keyword/category/condition/donation/lending/city/author/publisher/isbn filters
- Supports geo filters with `userLatitude`, `userLongitude`, `radiusKm`
- Response: `200 OK` with `Page<BookResponse>`

6. `GET /api/books/my`
- Required header: `X-User-Id`
- Pageable params: `page`, `size`, `sort`
- Response: `200 OK` with `Page<BookResponse>`

7. `GET /api/books/popular`
- Cached list of top 10 AVAILABLE books by request count
- Response: `200 OK` with `List<BookResponse>`

8. `PATCH /api/books/{id}/status?status=AVAILABLE|REQUESTED|BORROWED`
- Internal service-to-service endpoint
- Response: `200 OK`

Recommendation API base URL: `/api/recommendations`

9. `GET /api/recommendations/{bookId}`
- Returns top 6 books where:
  - same category OR same author
  - book id excluded
  - status AVAILABLE
- Response: `200 OK` with `List<BookResponse>`

## DTO Validation Rules

### CreateBookRequest

- `title`, `author`, `city`: required (`@NotBlank`)
- `category`, `condition`: required (`@NotNull`)
- At least one of `isDonation` or `isLending` must be `true`

### UpdateBookRequest

- All fields optional

### BookSearchRequest Defaults

- `radiusKm=50.0`
- `page=0`
- `size=10`
- `sortBy=createdAt`
- `sortDir=desc`

## S3 Upload Rules

Image upload:
- Allowed content types: `image/jpeg`, `image/png`, `image/webp`
- Max size: `5MB`
- Key format: `books/{bookId}/{uuid}.{ext}`

PDF upload:
- Allowed type: `application/pdf`
- Max size: `5MB`
- Key format: `pdfs/{uuid}.pdf`

S3 delete failures are logged as warnings and do not throw.

## Redis Caching

Cached:
- `books::popular` (from `@Cacheable(value="books", key="'popular'")`)

Manual invalidation (service-level):
- `books:popular`
- `books:search:*`

Note: key naming between Spring Cache and manual key delete should be kept consistent if cache strategy evolves.

## Kafka Events

Topic: `book-events`

Published events:
- `BOOK_ADDED`: `{ eventType, bookId, ownerId }`
- `BOOK_DELETED`: `{ eventType, bookId }`

## Exception Handling

Global handler returns structured JSON with:
- `timestamp`
- `status`
- `message`
- `path`
- optional `details`

Handled:
- `MethodArgumentNotValidException` -> `400`
- `IllegalArgumentException` -> `400`
- `AccessDeniedException` -> `403`
- Fallback `Exception` -> `500`

## Verification Summary (Current)

Performed in this workspace:

1. `mvn test` on `book-service`
- Result: **BUILD SUCCESS**
- Notes: no automated tests exist yet (`No tests to run`)

2. `mvn -DskipTests compile`
- Result: **BUILD SUCCESS**

Meaning:
- Code compiles and wiring is valid.
- Runtime integration (MySQL/Redis/Kafka/Eureka/S3) still requires environment-based smoke testing.

## Manual Smoke Test Checklist

1. Start dependencies:
- MySQL with `book_db`
- Redis on `6379`
- Kafka on `9092`
- Eureka on `8761`
- Valid AWS credentials + bucket env vars

2. Start service:
- `mvn spring-boot:run`

3. Verify health:
- `GET /actuator/health`

4. Verify API docs:
- `GET /swagger-ui.html`

5. Test book lifecycle:
- Create book with image
- Fetch by id
- Update with replacement images
- Search filters and pagination
- Popular books endpoint
- Delete book (owner/admin)

6. Validate side effects:
- S3 objects created/deleted
- Kafka events published to `book-events`
- Redis cache invalidation after writes
