# Request Service

## Responsibility

Request Service owns the full request lifecycle for donation/lending transactions, including state transitions, due-date handling, return-status tracking, and post-completion reviews.

## Port

- `8083` internal (routed via Gateway)

## Key Dependencies

- MySQL (`request_db`)
- Kafka producer (`request-events`)
- HTTP dependency on book-service (book validation/status patch)
- HTTP dependency on auth-service (name enrichment)

## Configuration

Important keys:

- `app.book-service.url`
- `app.auth-service.url`
- `spring.kafka.bootstrap-servers`

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/requests` | Yes | Create request for a book |
| GET | `/api/requests/sent` | Yes | List requests created by caller |
| GET | `/api/requests/received` | Yes | List requests where caller is owner |
| PUT | `/api/requests/{id}/approve` | Yes | Owner approves request |
| PUT | `/api/requests/{id}/reject` | Yes | Owner rejects request |
| PUT | `/api/requests/{id}/cancel` | Yes | Sender cancels pending request |
| PUT | `/api/requests/{id}/return-status` | Yes | Owner updates return status |
| GET | `/api/requests/overdue-soon` | Yes | List requests nearing due date |
| POST | `/api/reviews` | Yes | Create rating/review |
| GET | `/api/reviews/user/{userId}` | Yes | Get reviews for a user |

## State Machine

Request status transitions:

- `PENDING -> APPROVED`
- `PENDING -> REJECTED`
- `PENDING -> CANCELLED`

Lending return transitions:

- `PENDING -> RETURNED`
- `PENDING -> NOT_RETURNED`

Book status integration:

- create request: `AVAILABLE -> REQUESTED`
- approve request: `REQUESTED -> BORROWED`
- reject/cancel/returned: `-> AVAILABLE`

## Key Classes

- `RequestController`: request APIs.
- `ReviewController`: review APIs.
- `RequestService`: lifecycle logic and event publication.
- `ReviewService`: review creation and lookup.
- `BookRequest`, `Review`: JPA entities.
- `KafkaTopicConfig`: declares `request-events` and `book-events` topics.

## Kafka

Topic `request-events` event types:

- `REQUEST_CREATED`
- `REQUEST_APPROVED`
- `REQUEST_REJECTED`
- `REQUEST_CANCELLED`
- `REQUEST_RETURNED`

Payload class: `BookRequestEvent`.

## Security Notes

- Ownership checks are enforced in service logic.
- Sender/receiver restrictions prevent unauthorized transitions.
- Duplicate pending request validation prevents spam for same book/sender pair.
