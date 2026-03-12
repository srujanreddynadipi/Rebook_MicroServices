# ReBook — API Gateway

The API Gateway is the single entry point for all client traffic in the ReBook microservices platform. It handles request routing, JWT authentication enforcement, and CORS for every downstream service.

---

## Technology Stack

| Concern | Library / Version |
|---|---|
| Runtime | Java 17 |
| Framework | Spring Boot 3.1.12 |
| Gateway engine | Spring Cloud Gateway 4.0.9 (reactive / WebFlux — **no** `spring-boot-starter-web`) |
| Service discovery | Spring Cloud Netflix Eureka Client (Spring Cloud 2022.0.5) |
| JWT | jjwt 0.11.5 (`jjwt-api` compile, `jjwt-impl` + `jjwt-jackson` runtime) |
| Observability | Spring Boot Actuator |
| Build | Maven 3 |

---

## Project Structure

```
api-gateway/
├── pom.xml
└── src/main/
    ├── java/com/rebook/
    │   ├── apigateway/
    │   │   └── ApiGatewayApplication.java      # Main entry point
    │   └── gateway/
    │       ├── config/
    │       │   └── GatewayConfig.java           # Route definitions + CORS bean
    │       └── filter/
    │           ├── JwtAuthenticationFilter.java  # Gateway filter — JWT enforcement
    │           └── JwtUtil.java                  # JWT validation + claim extraction
    └── resources/
        └── application.yml
```

> **Component scan note:** `@SpringBootApplication(scanBasePackages = "com.rebook")` is set on the main class so that beans in `com.rebook.gateway.*` (a different sub-package) are picked up correctly.

---

## Configuration

All configuration lives in `src/main/resources/application.yml`.

```yaml
server:
  port: 8080

spring:
  application:
    name: api-gateway

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/

management:
  endpoints:
    web:
      exposure:
        include: health,info,gateway

app:
  jwt:
    secret: ${APP_JWT_SECRET:change-me-in-env}

logging:
  level:
    org.springframework.cloud.gateway: DEBUG
    org.springframework.cloud.gateway.route.RouteDefinitionRouteLocator: DEBUG
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_JWT_SECRET` | `change-me-in-env` | Secret used to verify JWT signatures. **Must be overridden in production.** |

---

## Running Locally

### Prerequisites

- Java 17+
- Maven 3.9+
- Eureka Server running on port `8761` (see `eureka-server/`)

### Start

```bash
cd api-gateway
mvn spring-boot:run
```

The gateway starts on **http://localhost:8080**.

### Health check

```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

---

## JWT Authentication

Authentication is implemented as a per-route reactive `GatewayFilter` (`JwtAuthenticationFilter`) that extends `AbstractGatewayFilterFactory`.

### How it works

1. The filter checks the incoming request path against the excluded paths list.
2. If not excluded, it reads the `Authorization` header.
3. If the header is missing or does not start with `Bearer `, it returns **401**.
4. The token is validated via `JwtUtil.validateToken()`.
5. If the token is invalid or expired, it returns **401**.
6. On success, two headers are injected into the downstream request:
   - `X-User-Id` — extracted from the `userId` claim (falls back to JWT subject)
   - `X-User-Roles` — extracted from the `roles` claim (comma-separated string)

### JWT signing key

`JwtUtil` hashes the raw secret string with **SHA-256** on startup (`@PostConstruct`) to produce a 256-bit HMAC-SHA key, matching the requirement of `io.jsonwebtoken.security.Keys.hmacShaKeyFor`.

### Excluded paths (no JWT required)

| Path pattern | Reason |
|---|---|
| `/api/auth/register` | Public registration |
| `/api/auth/login` | Public login |
| `/api/auth/refresh-token` | Token refresh |
| `/eureka/**` | Eureka peer communication |
| `/actuator/**` | Health / management endpoints |

### Error response format

When the filter rejects a request it returns HTTP **401** with `Content-Type: application/json`:

```json
{
  "timestamp": "2026-03-10T17:01:32.584Z",
  "status": 401,
  "error": "UNAUTHORIZED",
  "message": "Missing or invalid Authorization header",
  "path": "/api/requests/1"
}
```

---

## Route Table

Routes are defined programmatically in `GatewayConfig.java` using `RouteLocatorBuilder`. All upstream URIs use Eureka load-balanced addresses (`lb://<service-name>`).

### Auth Service (`lb://auth-service`)

| Route ID | Method(s) | Path | JWT Required |
|---|---|---|---|
| `auth-public` | POST | `/api/auth/**` | No |
| `auth-users` | GET, PUT | `/api/users/**` | Yes |
| `auth-admin-users` | DELETE, PUT | `/api/admin/users/**` | Yes |

### Book Service (`lb://book-service`)

| Route ID | Method(s) | Path | JWT Required |
|---|---|---|---|
| `book-search` | GET | `/api/books/search` | No |
| `book-list` | GET | `/api/books` | No |
| `book-by-id` | GET | `/api/books/{id}` | No |
| `book-mutate` | POST, PUT, DELETE | `/api/books/**` | Yes |
| `book-recommendations` | GET | `/api/recommendations/**` | No |

### Request Service (`lb://request-service`)

| Route ID | Method(s) | Path | JWT Required |
|---|---|---|---|
| `requests-all` | ALL | `/api/requests/**` | Yes |
| `reviews-all` | ALL | `/api/reviews/**` | Yes |

### Chat Service (`lb://chat-service`)

| Route ID | Method(s) | Path | JWT Required |
|---|---|---|---|
| `chat-api` | ALL | `/api/messages/**` | Yes |
| `chat-websocket` | ALL | `/ws/**` | No (auth handled inside chat-service) |

### Notification Service (`lb://notification-service`)

| Route ID | Method(s) | Path | JWT Required |
|---|---|---|---|
| `notifications-get` | GET | `/api/notifications/**` | Yes |

> **Route ordering note:** `book-search` and `book-list` are declared before `book-by-id` and `book-mutate` to prevent the wildcard `/**` predicates from shadowing the more specific paths.

---

## CORS

A global `CorsWebFilter` bean (in `GatewayConfig`) applies the following policy for **local development**:

| Setting | Value |
|---|---|
| Allowed origins | `*` (all, via `setAllowedOriginPatterns`) |
| Allowed methods | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| Allowed headers | `*` |
| Exposed headers | `Authorization`, `X-User-Id`, `X-User-Roles` |
| Allow credentials | `true` |
| Max age | 3600 s |

> **Production note:** Replace `*` with your exact frontend origin(s) before deploying.

---

## Actuator Endpoints

| Endpoint | URL | Description |
|---|---|---|
| Health | `GET /actuator/health` | Service liveness |
| Info | `GET /actuator/info` | Build info |
| Gateway routes | `GET /actuator/gateway/routes` | All registered routes |

---

## Building a Docker Image

A multi-stage `Dockerfile` is not yet added to this module. When added, the recommended pattern (matching `eureka-server/Dockerfile`) is:

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/api-gateway-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and run:

```bash
docker build -t rebook-api-gateway:dev .
docker run -p 8080:8080 \
  -e APP_JWT_SECRET=your-secret-here \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/ \
  rebook-api-gateway:dev
```
