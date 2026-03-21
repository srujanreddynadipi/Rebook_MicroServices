# Notification Service

## Responsibility

Notification Service aggregates asynchronous domain events into user-facing notifications and optional email delivery. It provides paginated notification retrieval and read-state management APIs.

## Port

- `8085` internal (routed via Gateway)

## Key Dependencies

- MySQL (`notification_db`)
- Kafka consumers for `request-events` and `chat-events`
- SMTP provider via Spring Mail
- auth-service lookup for enriched sender/receiver names/emails

## Configuration

Important keys:

- `spring.mail.host=smtp.gmail.com`
- `spring.mail.username=${MAIL_USERNAME}`
- `spring.mail.password=${MAIL_PASSWORD}`
- `app.auth-service.url`
- `app.request-service.url`

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Yes | Paginated notification feed for current user |
| GET | `/api/notifications/unread-count` | Yes | Unread count |
| PUT | `/api/notifications/{id}/read` | Yes | Mark one as read |
| PUT | `/api/notifications/read-all` | Yes | Mark all as read |

Accepted identity headers:

- `X-User-Id` (gateway standard)
- `userId` (legacy fallback)

## Key Classes

- `NotificationController`: REST endpoints.
- `NotificationService`: creation/read operations.
- `NotificationQueryService`: retrieval composition.
- `RequestEventConsumer`: consumes request lifecycle topic.
- `ChatEventConsumer`: consumes chat message topic.
- `EmailService`: SMTP notification templates and dispatch.
- `Notification`: JPA entity.

## Kafka

### Consumer: `request-events`

Maps lifecycle events to notification types:

- `REQUEST_CREATED -> REQUEST_RECEIVED`
- `REQUEST_APPROVED -> REQUEST_APPROVED`
- `REQUEST_REJECTED -> REQUEST_REJECTED`
- `REQUEST_RETURNED -> REQUEST_RETURNED`
- `REQUEST_CANCELLED -> SYSTEM`

### Consumer: `chat-events`

- Converts incoming chat event to `NEW_MESSAGE` notification.

## Security Notes

- User id is mandatory; invalid/missing user id returns `400`.
- Notifications are always scoped by resolved caller user id.
- Email health check is explicitly disabled in actuator health to avoid false negatives when SMTP is optional.
