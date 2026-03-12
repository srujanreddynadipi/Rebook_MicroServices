# Auth Service — ReBook Microservices

Handles **user registration, login, JWT authentication, and user profile management** for the ReBook platform.

- **Port:** `8081`
- **Spring Boot:** `3.1.12`
- **Database:** `auth_db` (MySQL)
- **Registers with:** Eureka Server (`http://localhost:8761/eureka`)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Package Structure](#2-package-structure)
3. [How to Run](#3-how-to-run)
   - [Local (without Docker)](#31-local-without-docker)
   - [Docker (full stack)](#32-docker-full-stack)
4. [Configuration](#4-configuration)
5. [Security Flow](#5-security-flow)
6. [API Reference](#6-api-reference)
   - [Auth Endpoints](#61-auth-endpoints-no-token-required)
   - [User Endpoints](#62-user-endpoints-jwt-required)
   - [Admin Endpoints](#63-admin-endpoints-role_admin-only)
7. [Request & Response Schemas](#7-request--response-schemas)
8. [Error Responses](#8-error-responses)
9. [Database Schema](#9-database-schema)
10. [Adding a New Developer](#10-adding-a-new-developer)

---

## 1. Architecture Overview

```
Client / Frontend
       │
       ▼
  API Gateway (:8080)         ← validates JWT, injects X-User-Id + X-User-Roles headers
       │
       ▼
  Auth Service (:8081)        ← this service
  ├── AuthController           POST /api/auth/**
  ├── UserController           GET/PUT /api/users/**  and  /api/admin/users/**
  ├── AuthService              register / login / refreshToken business logic
  ├── UserService              profile CRUD, ban/unban, delete
  ├── JwtUtil                  token generation & validation (HMAC-SHA256)
  ├── JwtAuthFilter            OncePerRequestFilter — extracts Bearer token per request
  ├── CustomUserDetailsService loads UserDetails by email from DB
  └── MySQL (auth_db)          persists User entities
```

**Token flow:**
1. Client calls `POST /api/auth/login` → gets `accessToken` (15 min) + `refreshToken` (7 days)
2. Client sends `Authorization: Bearer <accessToken>` on every protected request
3. API Gateway validates the token and adds `X-User-Id` and `X-User-Roles` headers before forwarding
4. Auth Service reads `X-User-Id` from the header (set by Gateway) — it does NOT re-validate the token internally for forwarded requests
5. When access token expires, client calls `POST /api/auth/refresh-token` with the refresh token

---

## 2. Package Structure

```
auth-service/
├── Dockerfile
├── pom.xml
└── src/main/
    ├── java/com/rebook/auth/
    │   ├── AuthServiceApplication.java          Entry point (@SpringBootApplication)
    │   │
    │   ├── config/
    │   │   ├── SecurityConfig.java              Spring Security — filter chain, CORS, RBAC
    │   │   └── SwaggerConfig.java               OpenAPI 3 definition + bearerAuth scheme
    │   │
    │   ├── controller/
    │   │   ├── AuthController.java              POST /api/auth/**
    │   │   └── UserController.java              GET/PUT /api/users/** , /api/admin/users/**
    │   │
    │   ├── service/
    │   │   ├── AuthService.java                 register, login, refreshToken
    │   │   └── UserService.java                 getProfile, update, ban, unban, delete
    │   │
    │   ├── entity/
    │   │   ├── User.java                        JPA entity — maps to `users` table
    │   │   └── Role.java                        Enum: ROLE_USER | ROLE_ADMIN
    │   │
    │   ├── repository/
    │   │   └── UserRepository.java              JPA repository — findByEmail, updateRating, etc.
    │   │
    │   ├── dto/
    │   │   ├── request/
    │   │   │   ├── RegisterRequest.java
    │   │   │   ├── LoginRequest.java
    │   │   │   ├── UpdateProfileRequest.java
    │   │   │   └── RefreshTokenRequest.java
    │   │   └── response/
    │   │       ├── AuthResponse.java            accessToken + refreshToken + user
    │   │       └── UserResponse.java            safe user view (no password)
    │   │
    │   ├── mapper/
    │   │   └── UserMapper.java                  MapStruct: User ↔ UserResponse
    │   │
    │   ├── security/
    │   │   ├── JwtUtil.java                     token generation, parsing, validation
    │   │   ├── JwtAuthFilter.java               extracts + validates Bearer token per request
    │   │   └── CustomUserDetailsService.java    loads UserDetails by email
    │   │
    │   └── exception/
    │       ├── ResourceNotFoundException.java   404 — user not found
    │       └── GlobalExceptionHandler.java      @RestControllerAdvice — maps exceptions to HTTP
    │
    └── resources/
        ├── application.yml                      Local dev config (localhost URLs)
        └── application-docker.yml               Docker config override (container name URLs)
```

---

## 3. How to Run

### 3.1 Local (without Docker)

**Prerequisites:** Java 17, Maven, MySQL running on port 3307 with database `auth_db`.

```bash
# 1. Start infrastructure (MySQL + Redis)
cd rebook-system
docker compose up -d mysql redis

# 2. Start Eureka Server (separate terminal)
cd eureka-server
mvn spring-boot:run

# 3. Start Auth Service (separate terminal)
cd auth-service
mvn spring-boot:run
```

Service will be available at `http://localhost:8081`.
Swagger UI: `http://localhost:8081/swagger-ui.html`

### 3.2 Docker (full stack)

**Prerequisites:** Docker Desktop running, `.env` file present at project root.

**Step 1 — Verify `.env` file** exists at `rebook-system/.env`:
```
APP_JWT_SECRET=cmVib29rLXNlY3JldC1rZXktMjU2LWJpdHMtbG9uZy1wbGFjZWhvbGRlcg==
MYSQL_ROOT_PASSWORD=root
```

**Step 2 — Build and start:**
```bash
cd rebook-system

# Build Docker images for all services
docker compose build eureka-server auth-service

# Start everything
docker compose up -d

# Check status
docker compose ps
```

**Step 3 — Verify:**
```bash
# Auth service health
curl http://localhost:8081/actuator/health

# Swagger UI
open http://localhost:8081/swagger-ui.html
```

**Startup order enforced by docker-compose:**
```
MySQL (healthy) ──┐
                  ├──► Eureka Server (healthy) ──► Auth Service
Redis             │
```

---

## 4. Configuration

| Property | Local value | Docker value | Description |
|----------|-------------|--------------|-------------|
| `server.port` | `8081` | `8081` | HTTP port |
| `spring.datasource.url` | `jdbc:mysql://localhost:3307/auth_db` | `jdbc:mysql://mysql:3306/auth_db` | MySQL URL |
| `spring.datasource.username` | `root` | `root` | MySQL user |
| `spring.datasource.password` | `root` | `${MYSQL_ROOT_PASSWORD}` | MySQL password |
| `spring.jpa.hibernate.ddl-auto` | `update` | `update` | Auto-creates/updates schema |
| `eureka.client.service-url.defaultZone` | `http://localhost:8761/eureka/` | `http://eureka-server:8761/eureka/` | Eureka registration URL |
| `app.jwt.secret` | base64 placeholder | `${APP_JWT_SECRET}` from `.env` | HMAC-SHA256 signing key |
| `app.jwt.expiration` | `900000` | same | Access token TTL (15 min in ms) |
| `app.jwt.refresh-expiration` | `604800000` | same | Refresh token TTL (7 days in ms) |

**To change the JWT secret for production:**
1. Generate a new 256-bit base64 secret: `openssl rand -base64 32`
2. Set `APP_JWT_SECRET=<new-value>` in your `.env` or environment

---

## 5. Security Flow

### Permitted without token (public):
| Method | Path |
|--------|------|
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/refresh-token` |
| GET | `/swagger-ui/**`, `/api-docs/**`, `/actuator/**` |

### Protected (JWT required):
All other endpoints require `Authorization: Bearer <accessToken>` header.

### RBAC:
Admin-only endpoints require the authenticated user to have `ROLE_ADMIN`. Enforced via `@PreAuthorize("hasRole('ADMIN')")`. A `ROLE_USER` token gets **403 Forbidden**.

### JWT structure:
```
Access token claims:
  sub  = user id (String)
  email = user email
  role  = ROLE_USER | ROLE_ADMIN
  iat  = issued at
  exp  = expiry (15 min from iat)

Refresh token claims:
  sub  = user id (String)
  iat  = issued at
  exp  = expiry (7 days from iat)
```

---

## 6. API Reference

### 6.1 Auth Endpoints (no token required)

#### POST `/api/auth/register`
Register a new user. Assigns `ROLE_USER` by default.

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "secret123",
    "mobile": "9876543210",
    "city": "Mumbai",
    "pincode": "400001",
    "latitude": 19.076,
    "longitude": 72.877
  }'
```

**Response `201 Created`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "mobile": "9876543210",
    "city": "Mumbai",
    "pincode": "400001",
    "latitude": 19.076,
    "longitude": 72.877,
    "role": "ROLE_USER",
    "isBanned": false,
    "averageRating": 0.0,
    "totalRatings": 0,
    "createdAt": "2026-03-11T10:00:00"
  }
}
```

---

#### POST `/api/auth/login`
Authenticate with email + password.

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123"}'
```

**Response `200 OK`:** Same shape as register response.

**Error cases:**
- `401` — wrong password or email not found (`"Invalid credentials"`)
- `403` — account is banned (`"Account is banned"`)

---

#### POST `/api/auth/refresh-token`
Exchange a valid refresh token for a new access token. The refresh token itself is not rotated.

```bash
curl -X POST http://localhost:8081/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGci..."}'
```

**Response `200 OK`:** Same shape as login. `refreshToken` field is the same token you sent.

**Error cases:**
- `401` — token expired or invalid (`"Invalid or expired refresh token"`)

---

### 6.2 User Endpoints (JWT required)

All requests need: `Authorization: Bearer <accessToken>`
Protected routes in auth-service also need `X-User-Id: <userId>` (the API Gateway injects this automatically; add it manually when calling auth-service directly in development).

#### GET `/api/users/profile`
Get the currently authenticated user's profile.

```bash
curl http://localhost:8081/api/users/profile \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-User-Id: 1"
```

**Response `200 OK`:** `UserResponse` object.

---

#### GET `/api/users/{id}`
Get any user's public profile by ID.

```bash
curl http://localhost:8081/api/users/1 \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200 OK`:** `UserResponse` object.
**Error:** `404` if user not found.

---

#### PUT `/api/users/profile`
Update the authenticated user's profile. Only the fields you send are updated (null fields are ignored by MapStruct).

```bash
curl -X PUT http://localhost:8081/api/users/profile \
  -H "Authorization: Bearer <accessToken>" \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith", "city": "Delhi", "mobile": "1111111111"}'
```

**Response `200 OK`:** Updated `UserResponse`.

---

### 6.3 Admin Endpoints (ROLE_ADMIN only)

Requires a JWT with `role: ROLE_ADMIN`. Returns `403` for `ROLE_USER` tokens.

#### GET `/api/admin/users`
Paginated list of all users.

```bash
curl "http://localhost:8081/api/admin/users?page=0&size=20&sort=id" \
  -H "Authorization: Bearer <adminAccessToken>"
```

**Response `200 OK`:** Spring `Page<UserResponse>` — includes `content`, `totalElements`, `totalPages`, etc.

---

#### PUT `/api/admin/users/{id}/ban`
Ban a user (sets `isBanned = true`). Banned users cannot log in.

```bash
curl -X PUT http://localhost:8081/api/admin/users/5/ban \
  -H "Authorization: Bearer <adminAccessToken>"
```

**Response `204 No Content`**

---

#### PUT `/api/admin/users/{id}/unban`
Unban a user.

```bash
curl -X PUT http://localhost:8081/api/admin/users/5/unban \
  -H "Authorization: Bearer <adminAccessToken>"
```

**Response `204 No Content`**

---

#### DELETE `/api/admin/users/{id}`
Permanently delete a user record.

```bash
curl -X DELETE http://localhost:8081/api/admin/users/5 \
  -H "Authorization: Bearer <adminAccessToken>"
```

**Response `204 No Content`**

---

## 7. Request & Response Schemas

### RegisterRequest
| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| `name` | String | `@NotBlank` | ✅ |
| `email` | String | `@NotBlank @Email` | ✅ |
| `password` | String | `@NotBlank @Size(min=8)` | ✅ |
| `mobile` | String | — | ❌ |
| `city` | String | — | ❌ |
| `pincode` | String | — | ❌ |
| `latitude` | Double | — | ❌ |
| `longitude` | Double | — | ❌ |

### LoginRequest
| Field | Type | Validation |
|-------|------|-----------|
| `email` | String | `@NotBlank @Email` |
| `password` | String | `@NotBlank` |

### UpdateProfileRequest
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | optional |
| `mobile` | String | optional |
| `city` | String | optional |
| `pincode` | String | optional |
| `latitude` | Double | optional |
| `longitude` | Double | optional |

### RefreshTokenRequest
| Field | Type | Validation |
|-------|------|-----------|
| `refreshToken` | String | `@NotBlank` |

### UserResponse (returned in all user-facing responses)
| Field | Type | Notes |
|-------|------|-------|
| `id` | Long | |
| `name` | String | |
| `email` | String | |
| `mobile` | String | |
| `city` | String | |
| `pincode` | String | |
| `latitude` | Double | |
| `longitude` | Double | |
| `role` | String | `ROLE_USER` or `ROLE_ADMIN` |
| `isBanned` | boolean | |
| `averageRating` | Double | default `0.0` |
| `totalRatings` | Integer | default `0` |
| `createdAt` | LocalDateTime | |

---

## 8. Error Responses

All errors follow the same JSON shape:

```json
{
  "timestamp": "2026-03-11T10:05:00.123",
  "status": 404,
  "message": "User not found with id: 99",
  "path": "uri=/api/users/99"
}
```

For validation errors (`400`), a `details` map is also included:

```json
{
  "timestamp": "2026-03-11T10:05:00.123",
  "status": 400,
  "message": "Validation failed",
  "path": "uri=/api/auth/register",
  "details": {
    "email": "must be a well-formed email address",
    "password": "size must be between 8 and 2147483647",
    "name": "must not be blank"
  }
}
```

| HTTP | Scenario |
|------|----------|
| `400` | Validation failure, bad request body |
| `401` | Missing/invalid/expired JWT, wrong credentials, expired refresh token |
| `403` | Token valid but user lacks required role, banned account |
| `404` | User not found by ID |
| `409` | Email already registered |
| `500` | Unexpected server error |

---

## 9. Database Schema

Table: `auth_db.users` (auto-created by Hibernate `ddl-auto: update`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT AUTO_INCREMENT | PK |
| `name` | VARCHAR NOT NULL | |
| `email` | VARCHAR NOT NULL UNIQUE | used as username |
| `password` | VARCHAR NOT NULL | BCrypt hashed (strength 12) |
| `mobile` | VARCHAR | |
| `city` | VARCHAR | |
| `pincode` | VARCHAR | |
| `latitude` | DOUBLE | for geo-distance search |
| `longitude` | DOUBLE | for geo-distance search |
| `role` | VARCHAR(20) NOT NULL | `ROLE_USER` or `ROLE_ADMIN` |
| `is_banned` | TINYINT(1) NOT NULL | default `0` |
| `average_rating` | DOUBLE NOT NULL | default `0.0` |
| `total_ratings` | INT NOT NULL | default `0` |
| `created_at` | DATETIME | set on insert |
| `updated_at` | DATETIME | updated on every save |

---

## 10. Swagger UI — Testing Guide

The auth-service ships with an OpenAPI 3 / Swagger UI interface that lets you test every endpoint directly from the browser.

**URL:** `http://localhost:8081/swagger-ui.html`
**Raw API docs:** `http://localhost:8081/api-docs`

---

### 10.1 Opening Swagger UI

1. Make sure all Docker services are running:
   ```bash
   docker-compose up -d
   docker-compose ps   # all should show "healthy" or "Up"
   ```
2. Open `http://localhost:8081/swagger-ui.html` in your browser.
3. You will see two controller groups:
   - **Authentication** — `POST /api/auth/**` (no token needed)
   - **user-controller** — `GET/PUT/DELETE /api/users/**` and `/api/admin/users/**` (JWT required)

---

### 10.2 Step 1 — Register a New User

**Endpoint:** `POST /api/auth/register`

Click **Try it out**, paste the body below, and click **Execute**:

```json
{
  "name": "Test User",
  "email": "testuser1@example.com",
  "password": "Password@123",
  "mobile": "9876543210",
  "city": "Hyderabad",
  "pincode": "500001",
  "latitude": 17.385,
  "longitude": 78.4867
}
```

**Validation rules:**
- `name` — required, non-blank
- `email` — required, must be a valid email format
- `password` — required, minimum 8 characters
- All other fields (mobile, city, pincode, latitude, longitude) are optional

**Expected response — `201 Created`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiZW1haWwiOiJ0ZXN0dXNlcjFAZXhhbXBsZS5jb20iLCJyb2xlIjoiUk9MRV9VU0VSIiwiaWF0IjoxNzczMTk4OTQ3LCJleHAiOjE3NzMxOTk4NDd9.XPsMI1SWLYLR7WJMi9ZPpLJCIvmvOMq9zMCxbm4ENEs",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiaWF0IjoxNzczMTk4OTQ3LCJleHAiOjE3NzM4MDM3NDd9.C_mubAKmFEVB9R6Ot5m1DB9XpkA41tMpo36Gchth1jg",
  "tokenType": "Bearer",
  "user": {
    "id": 3,
    "name": "Test User",
    "email": "testuser1@example.com",
    "mobile": "9876543210",
    "city": "Hyderabad",
    "pincode": "500001",
    "latitude": 17.385,
    "longitude": 78.4867,
    "role": "ROLE_USER",
    "averageRating": 0,
    "totalRatings": 0,
    "createdAt": "2026-03-11T03:15:47.643483",
    "banned": false
  }
}
```

> **Save these values from the response:**
> - `accessToken` → used to authorize subsequent requests
> - `refreshToken` → used to get a new access token
> - `user.id` → needed as the `X-User-Id` header for profile endpoints

---

### 10.3 Step 2 — Login

**Endpoint:** `POST /api/auth/login`

```json
{
  "email": "testuser1@example.com",
  "password": "Password@123"
}
```

**Expected response — `200 OK`:** Same shape as register. Always use the `accessToken` from the **most recent** login response.

**Error cases:**

| Scenario | HTTP | Message |
|----------|------|---------|
| Wrong password | `401` | `"Invalid credentials"` |
| Email not registered | `401` | `"Invalid credentials"` |
| Account is banned | `403` | `"Account is banned"` |

---

### 10.4 Step 3 — Refresh Token

**Endpoint:** `POST /api/auth/refresh-token`

Paste the `refreshToken` from register/login:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiaWF0IjoxNzczMTk0OTQ3LCJleHAiOjE3NzM4MDM3NDd9.C_mubAKmFEVB9R6Ot5m1DB9XpkA41tMpo36Gchth1jg"
}
```

**Expected response — `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.<new_payload>.<new_signature>",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9.<same_refresh_token>",
  "tokenType": "Bearer",
  "user": { ... }
}
```

> The `refreshToken` is **not rotated** — the same refresh token is returned. Only the `accessToken` is regenerated.

**Error cases:**

| Scenario | HTTP | Message |
|----------|------|---------|
| Token expired | `401` | `"Invalid or expired refresh token"` |
| Token tampered/invalid | `401` | `"Invalid or expired refresh token"` |

---

### 10.5 Step 4 — Authorize in Swagger UI (for protected endpoints)

Before calling any `/api/users/**` or `/api/admin/users/**` endpoint:

1. Click the **Authorize** button (top-right, lock icon 🔒)
2. In the `bearerAuth (http, Bearer)` box, paste your `accessToken`:
   ```
   eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiZW1haWwiOiJ...
   ```
   > Do **not** add `Bearer ` prefix — Swagger adds it automatically.
3. Click **Authorize**, then **Close**

The lock icon will now appear **closed** on every protected endpoint, indicating the token is active.

---

### 10.6 Step 5 — Test User Endpoints

#### GET `/api/users/{id}` — Get user by ID

- Enter `id = 3` (or whatever `user.id` you got from register)
- JWT must be set via Authorize (Step 4)
- Expected: `200 OK` with full user profile

**If you see `401`:** Token is missing or expired — re-authorize using the latest `accessToken` from login.

---

#### GET `/api/users/profile` — Get own profile

- Add header `X-User-Id: 3` in the Parameters section
- JWT must be set via Authorize (Step 4)
- Expected: `200 OK` with your profile

> **Why `X-User-Id`?** In production traffic flows through the API Gateway, which validates the JWT and injects `X-User-Id`. When calling auth-service directly (e.g., via Swagger or `curl`), you must supply this header manually.

---

#### PUT `/api/users/profile` — Update profile

- Add header `X-User-Id: 3`
- JWT must be set via Authorize (Step 4)
- Body (all fields optional):
```json
{
  "name": "Updated Name",
  "mobile": "9999999999",
  "city": "Bangalore",
  "pincode": "560001",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```
- Expected: `200 OK` with updated user object

---

### 10.7 Step 6 — Admin Endpoints

These endpoints require `ROLE_ADMIN`. A regular `ROLE_USER` token returns `403 Forbidden`.

| Endpoint | Description | Expected (ROLE_USER) |
|----------|-------------|----------------------|
| `GET /api/admin/users` | Paginated list of all users | `403 Forbidden` |
| `PUT /api/admin/users/{id}/ban` | Ban a user | `403 Forbidden` |
| `PUT /api/admin/users/{id}/unban` | Unban a user | `403 Forbidden` |
| `DELETE /api/admin/users/{id}` | Delete a user | `403 Forbidden` |

To test admin endpoints, you need to manually update a user's role in MySQL:

```bash
docker exec rebook-mysql mysql -uroot -proot -e \
  "USE auth_db; UPDATE users SET role='ROLE_ADMIN' WHERE email='testuser1@example.com';"
```

Then login again to get a new token with the `ROLE_ADMIN` claim.

---

### 10.8 Database Verification

After testing, verify your data is persisted in MySQL:

```bash
# View all users (password column excluded)
docker exec rebook-mysql mysql -uroot -proot -e \
  "USE auth_db; SELECT id, name, email, mobile, city, pincode, latitude, longitude, role, IF(is_banned=1,'BANNED','ACTIVE') AS status, average_rating, total_ratings, created_at FROM users\G"
```

**Actual data after Swagger testing session (March 11, 2026):**

```
*** row 1 ***
   id: 1  name: Updated Name  email: test@rebook.com
   city: Delhi  role: ROLE_USER  status: ACTIVE
   created_at: 2026-03-10 18:37:05

*** row 2 ***
   id: 2  name: DockerTest  email: dockertest@rebook.com
   role: ROLE_USER  status: ACTIVE
   created_at: 2026-03-10 19:15:56

*** row 3 ***
   id: 3  name: srujan reddy nadipi  email: testuser1@example.com
   mobile: 7671879587  city: Hyderabad  pincode: 500097
   latitude: 12.9716  longitude: 77.5946
   role: ROLE_USER  status: ACTIVE
   created_at: 2026-03-11 03:15:47
```

> Passwords are stored as BCrypt hashes (`$2a$12$...`) — never in plain text.

---

### 10.9 Quick Swagger Test Checklist

| # | Endpoint | What to test | Expected |
|---|----------|-------------|----------|
| 1 | `POST /api/auth/register` | New user with full fields | `201` + tokens + user object |
| 2 | `POST /api/auth/register` | Same email again | `409 Conflict` |
| 3 | `POST /api/auth/login` | Correct credentials | `200` + new tokens |
| 4 | `POST /api/auth/login` | Wrong password | `401 Unauthorized` |
| 5 | `POST /api/auth/refresh-token` | Valid refresh token | `200` + new access token |
| 6 | `GET /api/users/{id}` | Without Authorize | `401 Unauthorized` |
| 7 | `GET /api/users/{id}` | After Authorize with valid token | `200` + user object |
| 8 | `GET /api/users/profile` | With `X-User-Id` header + token | `200` + own profile |
| 9 | `PUT /api/users/profile` | Update name/city + `X-User-Id` | `200` + updated profile |
| 10 | `GET /api/admin/users` | With ROLE_USER token | `403 Forbidden` |

---

## 11. Adding a New Developer

1. **Clone the repo** and navigate to `rebook-system/`
2. **Create `.env`** in the project root (copy from the template above in section 3.2)
3. **Start infrastructure:**
   ```bash
   docker compose up -d mysql redis
   ```
4. **Start Eureka** (in a separate terminal):
   ```bash
   cd eureka-server && mvn spring-boot:run
   ```
5. **Start auth-service** (in a separate terminal):
   ```bash
   cd auth-service && mvn spring-boot:run
   ```
6. **Open Swagger UI:** `http://localhost:8081/swagger-ui.html`
7. **Register a user** via `POST /api/auth/register`, copy the `accessToken`, click **Authorize** in Swagger UI, and paste `Bearer <token>` to test protected endpoints.

### Key things to know before modifying this service:

- **MapStruct + Lombok:** Lombok must be listed **before** MapStruct in `annotationProcessorPaths` in `pom.xml`. Lombok boolean field `isBanned` exposes the property as `banned` to MapStruct (not `isBanned`) — use `@Mapping(target = "banned")`.
- **JWT key:** The secret is SHA-256 hashed at startup (`@PostConstruct`) to ensure it's exactly 256 bits for HMAC-SHA256.
- **Refresh token:** The refresh token has only a `sub` (userId) claim — no email or role. Use `validateRefreshToken()` (not `validateToken()`) to validate it, as `validateToken` expects an email claim.
- **X-User-Id header:** The API Gateway sets this header after validating the JWT. Auth-service endpoints read userId from this header, not from the token — this is intentional so the Gateway remains the single JWT validation point.
- **Spring profile for Docker:** The `application-docker.yml` profile overrides only the DB URL and Eureka URL. It is activated automatically when `SPRING_PROFILES_ACTIVE=docker` is set (done by docker-compose).
