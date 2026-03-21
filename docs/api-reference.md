# API Reference

Base URL (via gateway):

```text
http://localhost:8080
```

Authentication model:

- Public endpoints do not require `Authorization`.
- Protected endpoints require `Authorization: Bearer <access-token>`.
- Gateway injects `X-User-Id`, `X-User-Name`, and `X-User-Roles` for downstream services.

## Common Headers

```http
Authorization: Bearer <jwt-access-token>
Content-Type: application/json
```

Additional propagated headers on protected routes:

```http
X-User-Id: <long>
X-User-Name: <string>
X-User-Roles: ROLE_USER|ROLE_ADMIN
```

## Auth Service (`/api/auth`, `/api/users`, `/api/admin/users`)

### POST /api/auth/register

**Auth required:** No

**Request body**

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "mobile": "string",
  "city": "string",
  "pincode": "string",
  "latitude": 17.385,
  "longitude": 78.4867
}
```

**Response 201**

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "role": "ROLE_USER"
  }
}
```

**Notes:** Password is BCrypt-hashed before storage.

### POST /api/auth/login

**Auth required:** No

**Request body**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "role": "ROLE_USER"
  }
}
```

**Errors:** `400/401` invalid credentials, `400` banned account.

### POST /api/auth/refresh-token

**Auth required:** No

**Request body**

```json
{
  "refreshToken": "string"
}
```

**Response 200**

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "role": "ROLE_USER"
  }
}
```

### GET /api/users/profile

**Auth required:** Yes

**Headers**: `X-User-Id`

**Response 200**

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "mobile": "9876543210",
  "city": "Hyderabad",
  "pincode": "500001",
  "latitude": 17.385,
  "longitude": 78.4867,
  "role": "ROLE_USER",
  "banned": false,
  "averageRating": 4.5,
  "totalRatings": 20
}
```

### GET /api/users/{id}

**Auth required:** Yes (gateway-enforced)

**Path params:** `id` user id

**Response 200:** `UserResponse`

### PUT /api/users/profile

**Auth required:** Yes

**Headers**: `X-User-Id`

**Request body**

```json
{
  "name": "string",
  "mobile": "string",
  "city": "string",
  "pincode": "string",
  "latitude": 17.4,
  "longitude": 78.4
}
```

**Response 200:** `UserResponse`

### GET /api/admin/users

**Auth required:** Yes (Admin)

**Query params**

- `page` (default `0`)
- `size` (default `20`)
- `sort` (default `id`)

**Response 200**

```json
{
  "content": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "role": "ROLE_USER"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

### PUT /api/admin/users/{id}/ban

**Auth required:** Yes (Admin)

**Response 204:** No Content

### PUT /api/admin/users/{id}/unban

**Auth required:** Yes (Admin)

**Response 204:** No Content

### DELETE /api/admin/users/{id}

**Auth required:** Yes (Admin)

**Response 204:** No Content

## Book Service (`/api/books`, `/api/recommendations`)

### POST /api/books

**Auth required:** Yes

**Content-Type:** `multipart/form-data`

**Parts**

- `bookRequest` (JSON object mapped to `CreateBookRequest`)
- `images` (0..n files)

**`bookRequest` shape**

```json
{
  "title": "string",
  "author": "string",
  "publisher": "string",
  "isbn": "string",
  "keywords": "string",
  "category": "ENGINEERING",
  "condition": "USED_GOOD",
  "city": "string",
  "latitude": 17.385,
  "longitude": 78.4867,
  "donation": true,
  "lending": false
}
```

**Response 201:** `BookResponse`

### GET /api/books/{id}

**Auth required:** No

**Response 200**

```json
{
  "id": 101,
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "category": "ENGINEERING",
  "condition": "USED_GOOD",
  "status": "AVAILABLE",
  "ownerId": 22,
  "ownerName": "Bob",
  "city": "Hyderabad",
  "imageUrls": ["https://..."],
  "coverImageUrl": "https://..."
}
```

### PUT /api/books/{id}

**Auth required:** Yes

**Content-Type:** `multipart/form-data`

**Parts**

- `bookRequest` mapped to `UpdateBookRequest`
- `images` optional replacement set

**Response 200:** `BookResponse`

### DELETE /api/books/{id}

**Auth required:** Yes

**Headers:** `X-User-Id`, `X-User-Roles`

**Behavior:** owner or admin can delete.

**Response 204:** No Content

### GET /api/books/search

**Auth required:** No

**Query params**

- `keyword`
- `author`
- `publisher`
- `isbn`
- `city`
- `category`
- `condition`
- `isDonation`
- `isLending`
- `userLatitude`
- `userLongitude`
- `radiusKm`
- `page`
- `size`
- `sortBy`
- `sortDir`

**Response 200:** paginated `BookResponse` list.

### GET /api/books/my

**Auth required:** Yes

**Headers:** `X-User-Id`

**Query params:** `page`, `size`, `sort`

**Response 200:** paginated owner books.

### GET /api/books/popular

**Auth required:** No

**Response 200:** top books array.

### PATCH /api/books/{id}/status

**Auth required:** Yes (gateway route includes mutation methods)

**Query params**

- `status=AVAILABLE|REQUESTED|BORROWED`

**Response 200:** empty body.

### GET /api/books/users/{userId}/stats

**Auth required:** No

**Response 200**

```json
{
  "donatedCount": 10,
  "lentCount": 6
}
```

### POST /api/books/study-material/audiobook

**Auth required:** Yes

**Content-Type:** `multipart/form-data`

**Parts**

- `file` (required)
- `voice` (optional query param)

**Response 200:** binary audio stream with `Content-Disposition` filename.

### GET /api/recommendations/{bookId}

**Auth required:** No

**Response 200:** list of similar books.

## Request Service (`/api/requests`, `/api/reviews`)

### POST /api/requests

**Auth required:** Yes

**Headers:** `X-User-Id`, optional `X-User-Name`

**Request body**

```json
{
  "bookId": 101,
  "requestType": "LENDING",
  "noOfWeeks": 2
}
```

**Response 201:** `BookRequestResponse`

### GET /api/requests/sent

**Auth required:** Yes

**Query params**

- `status` optional (`PENDING|APPROVED|REJECTED|CANCELLED`)
- `page`, `size`, `sort`

**Response 200:** paginated sent requests.

### GET /api/requests/received

**Auth required:** Yes

**Query params**

- `status` optional
- `page`, `size`, `sort`

**Response 200:** paginated received requests.

### PUT /api/requests/{id}/approve

**Auth required:** Yes (book owner)

**Response 200:** updated `BookRequestResponse` (status `APPROVED`).

### PUT /api/requests/{id}/reject

**Auth required:** Yes (book owner)

**Response 200:** updated `BookRequestResponse` (status `REJECTED`).

### PUT /api/requests/{id}/cancel

**Auth required:** Yes (request sender)

**Response 200:** updated `BookRequestResponse` (status `CANCELLED`).

### PUT /api/requests/{id}/return-status

**Auth required:** Yes (owner)

**Request body**

```json
{
  "returnStatus": "RETURNED"
}
```

**Allowed values:** `PENDING`, `RETURNED`, `NOT_RETURNED`

**Response 200:** updated `BookRequestResponse`.

### GET /api/requests/overdue-soon

**Auth required:** Yes

**Response 200**

```json
[
  {
    "requestId": 99,
    "bookId": 101,
    "borrowerId": 11,
    "ownerId": 22,
    "bookTitle": "string",
    "dueDate": "2026-03-24"
  }
]
```

### POST /api/reviews

**Auth required:** Yes

**Headers:** `X-User-Id`

**Request body**

```json
{
  "requestId": 99,
  "reviewedUserId": 22,
  "rating": 5,
  "comment": "Great experience"
}
```

**Response 201:** `ReviewResponse`

### GET /api/reviews/user/{userId}

**Auth required:** Yes (gateway-protected)

**Response 200:** list of user reviews.

## Chat Service (`/api/messages`, websocket)

### POST /api/messages

**Auth required:** Yes

**Headers:** `X-User-Id` (or fallback `userId`)

**Request body**

```json
{
  "requestId": 99,
  "receiverId": 22,
  "content": "Hi, when can we meet?"
}
```

**Response 200:** `MessageResponse`

### GET /api/messages/{requestId}

**Auth required:** Yes

**Headers:** `X-User-Id` (or `userId`)

**Response 200:** chronological message list.

**Notes:** unread messages for receiver are marked read on retrieval.

### GET /api/messages/inbox

**Auth required:** Yes

**Response 200:** list of request conversations with unread counts.

### PUT /api/messages/{requestId}/read

**Auth required:** Yes

**Response 200:** empty body.

### WebSocket message mapping `/app/chat.send`

**Auth required:** Yes (WebSocket JWT interceptor)

**Payload**

```json
{
  "requestId": 99,
  "receiverId": 22,
  "content": "message"
}
```

**Broadcast target:** `/topic/requests/{requestId}`.

## Notification Service (`/api/notifications`)

### GET /api/notifications

**Auth required:** Yes

**Headers:** accepts either `X-User-Id` or `userId`

**Query params:** `page`, `size`, `sort`

**Response 200**

```json
{
  "content": [
    {
      "id": 1001,
      "userId": 22,
      "title": "Request approved",
      "message": "Your request was approved.",
      "type": "REQUEST_APPROVED",
      "read": false,
      "referenceId": 99,
      "createdAt": "2026-03-21T10:00:00"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

### GET /api/notifications/unread-count

**Auth required:** Yes

**Headers:** `X-User-Id` or `userId`

**Response 200**

```json
5
```

### PUT /api/notifications/{id}/read

**Auth required:** Yes

**Headers:** `X-User-Id` or `userId`

**Response 200:** empty body.

### PUT /api/notifications/read-all

**Auth required:** Yes

**Headers:** `X-User-Id` or `userId`

**Response 200:** empty body.

## RAG Service (`/api/rag`)

Frontend consumes these gateway routes.

### POST /api/rag/documents/upload

**Auth required:** Yes

**Content-Type:** `multipart/form-data`

**Parts:** `file`

**Response 200**

```json
{
  "documentId": 123,
  "message": "Document uploaded and indexed"
}
```

### GET /api/rag/documents

**Auth required:** Yes

**Response 200:** array of indexed documents.

### DELETE /api/rag/documents/{id}

**Auth required:** Yes

**Response 200/204:** deleted.

### POST /api/rag/chat

**Auth required:** Yes

**Request body**

```json
{
  "message": "Explain chapter 2",
  "sessionId": "optional-session-id",
  "maxResults": 4,
  "similarityThreshold": 0.2
}
```

**Response 200**

```json
{
  "sessionId": "string",
  "response": "assistant text",
  "chunksUsed": 3,
  "sourceDocuments": ["doc1.pdf"]
}
```

## Gateway Route Security Matrix

| Path Pattern | Method(s) | Auth |
|---|---|---|
| `/api/auth/**` | `POST` | Public |
| `/api/users/**` | `GET`, `PUT` | JWT |
| `/api/admin/users/**` | `GET`, `DELETE`, `PUT` | JWT + Admin at service level |
| `/api/books/search` | `GET` | Public |
| `/api/books` | `GET` | Public |
| `/api/books/{id}` | `GET` | Public |
| `/api/books/**` | `POST`, `PUT`, `DELETE` | JWT |
| `/api/recommendations/**` | `GET` | Public |
| `/api/requests/**` | all | JWT |
| `/api/reviews/**` | all | JWT |
| `/api/messages/**` | all | JWT |
| `/api/notifications/**` | `GET`, `PUT` | JWT |
| `/api/rag/**` | all | JWT |

## Standard Error Shapes

Gateway unauthorized sample:

```json
{
  "timestamp": "2026-03-21T10:00:00Z",
  "status": 401,
  "error": "UNAUTHORIZED",
  "message": "Missing or invalid Authorization header",
  "path": "/api/requests/sent"
}
```

Validation error sample:

```json
{
  "timestamp": "2026-03-21T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    "email must be a well-formed email address",
    "password size must be between 6 and 100"
  ]
}
```

Forbidden error sample:

```json
{
  "timestamp": "2026-03-21T10:00:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Only the book owner can perform this action"
}
```

Not found sample:

```json
{
  "timestamp": "2026-03-21T10:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Book not found"
}
```

## cURL Examples

### Register

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Alice",
    "email":"alice@example.com",
    "password":"StrongPass123",
    "city":"Hyderabad"
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"alice@example.com",
    "password":"StrongPass123"
  }'
```

### Search Books

```bash
curl "http://localhost:8080/api/books/search?keyword=java&city=hyderabad&page=0&size=10"
```

### Create Request

```bash
curl -X POST http://localhost:8080/api/requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId":101,
    "requestType":"LENDING",
    "noOfWeeks":2
  }'
```

### Approve Request

```bash
curl -X PUT http://localhost:8080/api/requests/99/approve \
  -H "Authorization: Bearer <token>"
```

### Send Message

```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId":99,
    "receiverId":22,
    "content":"Hello"
  }'
```

### Get Notifications

```bash
curl "http://localhost:8080/api/notifications?page=0&size=10" \
  -H "Authorization: Bearer <token>"
```

## Endpoint-to-Frontend Module Mapping

| Backend Endpoint Family | Frontend API Module |
|---|---|
| `/api/auth/*` | `authApi.js` |
| `/api/users/*`, `/api/admin/users/*` | `userApi.js`, `adminApi.js` |
| `/api/books/*`, `/api/recommendations/*` | `bookApi.js` |
| `/api/requests/*`, `/api/reviews/*` | `requestApi.js` |
| `/api/messages/*` | `chatApi.js` |
| `/api/notifications/*` | `notificationApi.js` |
| `/api/rag/*` | `ragApi.js` |

## Notes on Optional/Planned Endpoints

- Frontend `adminApi.js` references `/api/admin/users/{id}/role` and `/api/admin/stats`; these routes are not currently implemented in auth-service controllers and should be treated as planned extensions.
- Frontend `aiApi.js` references `/api/ai/*`; this path is feature-flagged and environment-dependent.
