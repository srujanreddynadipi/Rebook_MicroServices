# API Gateway

## Responsibility

API Gateway is the single HTTP entry point for clients. It enforces JWT validation for protected routes, forwards identity context as trusted internal headers, and routes requests to downstream services using Eureka service discovery.

## Port

- `8080` (external)

## Key Dependencies

- Eureka (`lb://` route targets)
- JWT secret (`APP_JWT_SECRET`)

## Configuration

Important keys from `application.yml`:

- `server.port=8080`
- `spring.application.name=api-gateway`
- `eureka.client.service-url.defaultZone`
- `app.jwt.secret`
- actuator exposure: `health,info,gateway`

## Routes

| Route ID | Method | Path Pattern | Target | Auth |
|---|---|---|---|---|
| `auth-public` | POST | `/api/auth/**` | `lb://auth-service` | No |
| `auth-users` | GET/PUT | `/api/users/**` | `lb://auth-service` | Yes |
| `auth-admin-users` | GET/PUT/DELETE | `/api/admin/users/**` | `lb://auth-service` | Yes |
| `book-search` | GET | `/api/books/search` | `lb://book-service` | No |
| `book-list` | GET | `/api/books` | `lb://book-service` | No |
| `book-by-id` | GET | `/api/books/{id}` | `lb://book-service` | No |
| `book-mutate` | POST/PUT/DELETE | `/api/books/**` | `lb://book-service` | Yes |
| `book-recommendations` | GET | `/api/recommendations/**` | `lb://book-service` | No |
| `requests-all` | ALL | `/api/requests/**` | `lb://request-service` | Yes |
| `reviews-all` | ALL | `/api/reviews/**` | `lb://request-service` | Yes |
| `chat-api` | ALL | `/api/messages/**` | `lb://chat-service` | Yes |
| `chat-websocket` | WS | `/ws/**` | `lb://chat-service` | WS auth in chat service |
| `notifications-get` | GET/PUT | `/api/notifications/**` | `lb://notification-service` | Yes |
| `rag-api` | ALL | `/api/rag/**` | `lb://rag-service` | Yes |

## Key Classes

- `GatewayConfig`: central route table + global CORS config.
- `JwtAuthenticationFilter`: checks bearer token, excludes auth/actuator/eureka paths, injects `X-User-*` headers.
- `JwtUtil`: parses and validates JWT signature/claims.

## Security Notes

- Excluded paths: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh-token`, `/eureka/**`, `/actuator/**`.
- On auth failure gateway returns standardized `401` JSON payload.
- CORS is permissive for development; should be restricted in production.
