# ReBook — GitHub Copilot Pro Prompts
# Marketplace for Used Books | Microservices + Kafka + Redis + AWS + Spring AI

> **How to use this file:**
> - Open the relevant service folder in VS Code
> - Open GitHub Copilot Chat (Ctrl+Shift+I)
> - Copy the prompt exactly and paste it into Copilot Chat
> - Review the generated code, then move to the next prompt
> - Prompts are ordered — do NOT skip steps within a service
> - Each prompt builds on the previous one

---

## GLOBAL TECH STACK REFERENCE
> Keep this in mind for every prompt. Copilot uses open files as context — always have the relevant file open before prompting.

```
Java 17 | Spring Boot 3.x | Maven
Spring Data JPA | Spring Security | Spring Cloud Gateway
Spring Cloud Netflix Eureka | Spring Kafka | Spring Data Redis
Spring AI (OpenAI) | Lombok | MapStruct | Swagger (springdoc-openapi)
Spring Boot Actuator | MySQL (separate schema per service)
Docker | AWS S3 (book images) | JWT Authentication
React 18 | Tailwind CSS | Axios | React Router v6 | React Query
```

---

## PROJECT STRUCTURE
```
rebook-system/
├── api-gateway/
├── eureka-server/
├── auth-service/
├── book-service/
├── request-service/
├── chat-service/
├── notification-service/
├── rag-service/
├── frontend-react/
└── docker-compose.yml
```

---

---

# ════════════════════════════════════════════
# PHASE 0 — INFRASTRUCTURE SETUP
# ════════════════════════════════════════════

---

## PROMPT 0.1 — Docker Compose (Full Infrastructure)
> **Where to use:** Root of `rebook-system/` folder
> **File to create:** `docker-compose.yml`

```
Create a docker-compose.yml file for the ReBook microservices project with the following services:

1. MySQL (mysql:8.0)
   - Single MySQL instance
   - Create 6 separate databases (schemas):
     auth_db, book_db, request_db, chat_db, notification_db, rag_db
   - Root password: root
   - Port: 3306
   - Use an init SQL script to create all 6 databases on startup
   - Named volume: mysql_data

2. Redis (redis:7-alpine)
   - Port: 6379
   - No password for local dev
   - Named volume: redis_data

3. Zookeeper (confluentinc/cp-zookeeper:7.4.0)
   - Port: 2181
   - Environment: ZOOKEEPER_CLIENT_PORT=2181

4. Kafka (confluentinc/cp-kafka:7.4.0)
   - Port: 9092
   - Depends on zookeeper
   - Environment:
     KAFKA_BROKER_ID=1
     KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
     KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
     KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
     KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT_INTERNAL
     KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
   - Named volume: kafka_data

5. Kafka UI (provectuslabs/kafka-ui:latest)
   - Port: 8090
   - Connects to kafka:29092
   - Useful for monitoring topics

6. Placeholder blocks (commented out) for all 8 Spring Boot services:
   eureka-server (port 8761)
   api-gateway (port 8080)
   auth-service (port 8081)
   book-service (port 8082)
   request-service (port 8083)
   chat-service (port 8084)
   notification-service (port 8085)
   rag-service (port 8086)

Include proper depends_on, healthchecks for MySQL and Kafka, and a shared network called rebook-network.
Also create the MySQL init script: docker/mysql/init.sql that creates all 6 databases.
```

---

## PROMPT 0.2 — Eureka Server
> **Where to use:** Inside `eureka-server/` folder after creating Spring Boot project
> **Spring Initializr deps:** Eureka Server, Spring Boot Actuator

```
Set up a Spring Boot 3 Eureka Service Discovery server for the ReBook microservices project.

Project details:
- Java 17, Maven
- Group: com.rebook
- Artifact: eureka-server
- Port: 8761

Generate the following:

1. pom.xml with dependencies:
   - spring-cloud-starter-netflix-eureka-server
   - spring-boot-starter-actuator
   - spring-cloud-dependencies BOM (2022.0.x compatible with Spring Boot 3)

2. EurekaServerApplication.java with @EnableEurekaServer annotation

3. application.yml with:
   - server.port: 8761
   - eureka.client.register-with-eureka: false
   - eureka.client.fetch-registry: false
   - eureka.server.enable-self-preservation: false (for dev)
   - Spring Boot Actuator endpoints exposed: health, info
   - Application name: eureka-server

4. Dockerfile:
   - Multi-stage build: maven:3.9-eclipse-temurin-17 for build, eclipse-temurin:17-jre-alpine for runtime
   - Expose port 8761
   - Healthcheck using /actuator/health
```

---

---

# ════════════════════════════════════════════
# PHASE 1 — API GATEWAY
# ════════════════════════════════════════════

---

## PROMPT 1.1 — Gateway pom.xml and Application Setup
> **Where to use:** Inside `api-gateway/` folder
> **Spring Initializr deps:** Gateway, Eureka Discovery Client, Actuator

```
Set up the API Gateway service for the ReBook microservices project.

Project details:
- Java 17, Maven, Spring Boot 3.x
- Group: com.rebook, Artifact: api-gateway
- Port: 8080

Generate:

1. pom.xml with:
   - spring-cloud-starter-gateway
   - spring-cloud-starter-netflix-eureka-client
   - spring-boot-starter-actuator
   - jjwt-api, jjwt-impl, jjwt-jackson (version 0.11.5) for JWT validation
   - spring-cloud-dependencies BOM (2022.0.x)
   - Note: Gateway uses reactive (WebFlux) — do NOT add spring-boot-starter-web

2. ApiGatewayApplication.java — main class with @SpringBootApplication

3. application.yml with:
   - server.port: 8080
   - spring.application.name: api-gateway
   - eureka.client.service-url.defaultZone: http://localhost:8761/eureka/
   - Actuator: expose health, info, gateway endpoints
   - app.jwt.secret: placeholder (to be set via env variable)
   - Logging level DEBUG for gateway routes
```

---

## PROMPT 1.2 — Gateway JWT Authentication Filter
> **Where to use:** `api-gateway/src/main/java/com/rebook/gateway/`
> **Open file context:** application.yml

```
Create a JWT Authentication Filter for the Spring Cloud Gateway in the ReBook project.

Requirements:
- Class: JwtAuthenticationFilter extending AbstractGatewayFilterFactory<JwtAuthenticationFilter.Config>
- Java 17, Spring Cloud Gateway (reactive/WebFlux based)
- JWT library: io.jsonwebtoken (jjwt 0.11.5)

Logic:
1. List of excluded paths (no auth needed):
   /api/auth/register, /api/auth/login, /api/auth/refresh-token
   /eureka/**, /actuator/**

2. For all other requests:
   - Extract Authorization header
   - Validate it starts with "Bearer "
   - Parse and validate JWT using secret from application.yml (${app.jwt.secret})
   - Extract userId and roles from JWT claims
   - Add them as request headers: X-User-Id, X-User-Roles
   - Forward the modified request to the downstream service
   - If token is missing or invalid: return 401 UNAUTHORIZED with JSON error body

3. Config inner class (can be empty for now)

4. JwtUtil.java utility class:
   - validateToken(String token): boolean
   - extractUserId(String token): String
   - extractRoles(String token): String
   - Uses @Value("${app.jwt.secret}") for the secret key

All classes in package: com.rebook.gateway.filter
```

---

## PROMPT 1.3 — Gateway Route Configuration
> **Where to use:** `api-gateway/src/main/java/com/rebook/gateway/config/`
> **Open file context:** JwtAuthenticationFilter.java

```
Create the routing configuration for the ReBook API Gateway using Spring Cloud Gateway.

Create GatewayConfig.java in package com.rebook.gateway.config

Define routes for all 5 downstream services using RouteLocatorBuilder:

1. AUTH SERVICE routes (lb://auth-service):
   - POST /api/auth/** → auth-service (NO JWT filter — public)
   - GET/PUT /api/users/** → auth-service (WITH JWT filter)
   - DELETE/PUT /api/admin/users/** → auth-service (WITH JWT filter + role check ROLE_ADMIN)

2. BOOK SERVICE routes (lb://book-service):
   - GET /api/books/search → book-service (NO JWT filter — public search)
   - GET /api/books/{id} → book-service (NO JWT filter — public)
   - GET /api/books → book-service (NO JWT filter)
   - POST/PUT/DELETE /api/books/** → book-service (WITH JWT filter)
   - GET /api/recommendations/** → book-service (NO JWT filter)

3. REQUEST SERVICE routes (lb://request-service):
   - ALL /api/requests/** → request-service (WITH JWT filter)
   - ALL /api/reviews/** → request-service (WITH JWT filter)

4. CHAT SERVICE routes (lb://chat-service):
   - ALL /api/messages/** → chat-service (WITH JWT filter)
   - /ws/** → chat-service (WebSocket — no JWT filter, handled by service)

5. NOTIFICATION SERVICE routes (lb://notification-service):
   - GET /api/notifications/** → notification-service (WITH JWT filter)

Apply JwtAuthenticationFilter as a GatewayFilter on routes that require authentication.
Add CircuitBreaker filter stub (commented out) for future resilience.
Add CORS global configuration allowing all origins for local development.
```

---

---

# ════════════════════════════════════════════
# PHASE 2 — AUTH SERVICE
# ════════════════════════════════════════════

---

## PROMPT 2.1 — Auth Service pom.xml and Project Structure
> **Where to use:** Inside `auth-service/` folder
> **Spring Initializr deps:** Web, JPA, MySQL Driver, Security, Validation, Actuator, Eureka Client

```
   Set up the Auth Service for the ReBook microservices project.

   Project details:
   - Java 17, Maven, Spring Boot 3.x
   - Group: com.rebook, Artifact: auth-service
   - Port: 8081
   - Database schema: auth_db

   Generate:

   1. pom.xml with ALL of the following dependencies:
      - spring-boot-starter-web
      - spring-boot-starter-data-jpa
      - spring-boot-starter-security
      - spring-boot-starter-validation
      - spring-boot-starter-actuator
      - spring-cloud-starter-netflix-eureka-client
      - mysql-connector-j
      - lombok
      - mapstruct (1.5.5.Final) + mapstruct-processor
      - springdoc-openapi-starter-webmvc-ui (2.x)
      - jjwt-api, jjwt-impl, jjwt-jackson (0.11.5)
      - Note: Add maven-compiler-plugin configured for Lombok + MapStruct annotation processing

   2. Package structure to create (empty placeholder classes):
      com.rebook.auth/
      ├── AuthServiceApplication.java
      ├── config/
      │   ├── SecurityConfig.java
      │   └── SwaggerConfig.java
      ├── controller/
      │   ├── AuthController.java
      │   └── UserController.java
      ├── service/
      │   ├── AuthService.java
      │   └── UserService.java
      ├── repository/
      │   └── UserRepository.java
      ├── entity/
      │   └── User.java
      ├── dto/
      │   ├── request/
      │   └── response/
      ├── mapper/
      │   └── UserMapper.java
      ├── security/
      │   ├── JwtUtil.java
      │   └── JwtAuthFilter.java
      └── exception/
         └── GlobalExceptionHandler.java

   3. application.yml:
      server.port: 8081
      spring.application.name: auth-service
      spring.datasource: MySQL with auth_db schema, username root, password root
      spring.jpa.hibernate.ddl-auto: update
      spring.jpa.show-sql: true
      eureka.client.service-url.defaultZone: http://localhost:8761/eureka/
      app.jwt.secret: (256-bit base64 secret placeholder)
      app.jwt.expiration: 900000 (15 minutes)
      app.jwt.refresh-expiration: 604800000 (7 days)
      springdoc.api-docs.path: /api-docs
      springdoc.swagger-ui.path: /swagger-ui.html
      Actuator: expose health, info endpoints
```

---

## PROMPT 2.2 — User Entity and Repository
> **Where to use:** `auth-service/src/main/java/com/rebook/auth/`
> **Open file context:** application.yml

```
Create the User entity and UserRepository for the ReBook Auth Service.

1. User.java entity in package com.rebook.auth.entity:
   - Annotations: @Entity, @Table(name="users"), @Data, @Builder, @NoArgsConstructor, @AllArgsConstructor (Lombok)
   - Fields:
     @Id @GeneratedValue(strategy=IDENTITY) Long id
     @Column(nullable=false) String name
     @Column(nullable=false, unique=true) String email
     @Column(nullable=false) String password (BCrypt hashed)
     String mobile
     String city
     String pincode
     Double latitude  (for geo-distance search)
     Double longitude
     @Enumerated(EnumType.STRING) Role role  (ROLE_USER or ROLE_ADMIN)
     boolean isBanned (default false)
     Double averageRating (default 0.0)
     Integer totalRatings (default 0)
     @CreationTimestamp LocalDateTime createdAt
     @UpdateTimestamp LocalDateTime updatedAt

2. Role.java enum in com.rebook.auth.entity:
   ROLE_USER, ROLE_ADMIN

3. UserRepository.java in com.rebook.auth.repository:
   - Extends JpaRepository<User, Long>
   - Optional<User> findByEmail(String email)
   - Boolean existsByEmail(String email)
   - Page<User> findByIsBannedFalse(Pageable pageable)  (admin view)
   - @Query to update averageRating: UPDATE User u SET u.averageRating = :rating, u.totalRatings = :total WHERE u.id = :userId
```

---

## PROMPT 2.3 — DTOs and MapStruct Mapper
> **Where to use:** `auth-service/src/main/java/com/rebook/auth/`
> **Open file context:** User.java entity

```
Create all DTOs and MapStruct mapper for the ReBook Auth Service.

1. Request DTOs in com.rebook.auth.dto.request:

   RegisterRequest.java:
   - @NotBlank String name
   - @NotBlank @Email String email
   - @NotBlank @Size(min=8) String password
   - String mobile
   - String city
   - String pincode
   - Double latitude
   - Double longitude
   Use @Data, @Builder, @NoArgsConstructor, @AllArgsConstructor (Lombok)

   LoginRequest.java:
   - @NotBlank @Email String email
   - @NotBlank String password

   UpdateProfileRequest.java:
   - String name
   - String mobile
   - String city
   - String pincode
   - Double latitude
   - Double longitude

   RefreshTokenRequest.java:
   - @NotBlank String refreshToken

2. Response DTOs in com.rebook.auth.dto.response:

   AuthResponse.java:
   - String accessToken
   - String refreshToken
   - String tokenType = "Bearer"
   - UserResponse user

   UserResponse.java:
   - Long id
   - String name
   - String email
   - String mobile
   - String city
   - String pincode
   - Double latitude
   - Double longitude
   - String role
   - boolean isBanned
   - Double averageRating
   - Integer totalRatings
   - LocalDateTime createdAt

3. UserMapper.java in com.rebook.auth.mapper:
   - @Mapper(componentModel = "spring")
   - UserResponse toResponse(User user)
   - List<UserResponse> toResponseList(List<User> users)
   - @Mapping(target = "id", ignore = true)
   - @Mapping(target = "password", ignore = true)
   - @Mapping(target = "role", ignore = true)
   - void updateUserFromRequest(UpdateProfileRequest request, @MappingTarget User user)
```

---

## PROMPT 2.4 — JWT Utility and Security Filter
> **Where to use:** `auth-service/src/main/java/com/rebook/auth/security/`
> **Open file context:** User.java, application.yml

```
Create the JWT utility class and security filter for the ReBook Auth Service.

1. JwtUtil.java in com.rebook.auth.security:
   - @Component with @Value("${app.jwt.secret}") String secret
   - @Value("${app.jwt.expiration}") long expiration
   - @Value("${app.jwt.refresh-expiration}") long refreshExpiration

   Methods:
   - String generateAccessToken(User user):
     Claims: subject=user.getId().toString(), "email"=user.getEmail(), "role"=user.getRole().name()
     Expiry: expiration milliseconds from now
     Sign with HMAC SHA-256

   - String generateRefreshToken(User user):
     Claims: subject=user.getId().toString()
     Expiry: refreshExpiration milliseconds
     Sign with HMAC SHA-256

   - Claims extractAllClaims(String token)
   - String extractUserId(String token)
   - String extractEmail(String token)
   - String extractRole(String token)
   - boolean isTokenExpired(String token)
   - boolean validateToken(String token, UserDetails userDetails)

2. JwtAuthFilter.java in com.rebook.auth.security:
   - Extends OncePerRequestFilter
   - Extract Bearer token from Authorization header
   - Validate token using JwtUtil
   - Load user by email from UserDetailsService
   - Set SecurityContextHolder authentication if valid
   - If token invalid: clear context and let request continue (let security config handle 401)

3. CustomUserDetailsService.java in com.rebook.auth.security:
   - Implements UserDetailsService
   - loadUserByUsername(String email): loads User from UserRepository by email
   - Returns UserDetails with email as username, hashed password, and [SimpleGrantedAuthority(role)]
   - Throws UsernameNotFoundException if not found
```

---

## PROMPT 2.5 — Security Configuration
> **Where to use:** `auth-service/src/main/java/com/rebook/auth/config/`
> **Open file context:** JwtAuthFilter.java, CustomUserDetailsService.java

```
Create the Spring Security configuration for the ReBook Auth Service.

SecurityConfig.java in com.rebook.auth.config:
- @Configuration @EnableWebSecurity @EnableMethodSecurity
- Inject JwtAuthFilter and CustomUserDetailsService

Configure SecurityFilterChain:
- Stateless session (SessionCreationPolicy.STATELESS)
- Disable CSRF
- CORS: allow all origins, all methods, all headers (for local dev)
- Permit without auth:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/refresh-token
  GET /api-docs/**
  GET /swagger-ui/**
  GET /actuator/**
- All other requests: authenticated
- Add JwtAuthFilter before UsernamePasswordAuthenticationFilter
- Custom 401 response: return JSON with message "Unauthorized" 

Also configure:
- PasswordEncoder bean: BCryptPasswordEncoder(strength=12)
- AuthenticationManager bean
- AuthenticationProvider bean (DaoAuthenticationProvider with CustomUserDetailsService + BCrypt)

SwaggerConfig.java in com.rebook.auth.config:
- @OpenAPIDefinition with info: title "ReBook Auth Service", version "1.0", description
- @SecurityScheme: name="bearerAuth", type=HTTP, scheme="bearer", bearerFormat="JWT"
```

---

## PROMPT 2.6 — Auth Service Business Logic
> **Where to use:** `auth-service/src/main/java/com/rebook/auth/service/`
> **Open file context:** User.java, JwtUtil.java, UserRepository.java, all DTOs

```
Create the AuthService and UserService for the ReBook Auth Service.

1. AuthService.java in com.rebook.auth.service:
   - @Service with constructor injection of UserRepository, JwtUtil, PasswordEncoder, UserMapper

   Methods:

   AuthResponse register(RegisterRequest request):
   - Check if email already exists → throw RuntimeException("Email already registered")
   - Create User entity, set role=ROLE_USER, encode password with BCrypt
   - Save user, generate access + refresh tokens
   - Return AuthResponse with both tokens and UserResponse

   AuthResponse login(LoginRequest request):
   - Find user by email → throw RuntimeException("Invalid credentials") if not found
   - Check isBanned → throw RuntimeException("Account is banned")
   - Verify password with BCrypt → throw RuntimeException("Invalid credentials")
   - Generate new access + refresh tokens
   - Return AuthResponse

   AuthResponse refreshToken(RefreshTokenRequest request):
   - Validate refresh token using JwtUtil
   - Extract userId, load user
   - Generate new access token (refresh token stays the same)
   - Return AuthResponse

2. UserService.java in com.rebook.auth.service:
   - @Service with constructor injection

   Methods:
   - UserResponse getProfile(Long userId): find by id, map to response
   - UserResponse getUserById(Long userId): find by id, map to response
   - UserResponse updateProfile(Long userId, UpdateProfileRequest request): update fields, save
   - Page<UserResponse> getAllUsers(Pageable pageable): admin only
   - void banUser(Long userId): set isBanned=true, save
   - void unbanUser(Long userId): set isBanned=false, save
   - void deleteUser(Long userId): delete by id

   All methods throw ResourceNotFoundException (create this custom exception) if user not found.
```

---

## PROMPT 2.7 — Auth Controllers
> **Where to use:** `auth-service/src/main/java/com/rebook/auth/controller/`
> **Open file context:** AuthService.java, UserService.java, all DTOs

```
Create REST controllers for the ReBook Auth Service.

1. AuthController.java in com.rebook.auth.controller:
   - @RestController @RequestMapping("/api/auth")
   - @Tag(name = "Authentication", description = "Register and login endpoints") — Swagger
   - Inject AuthService

   Endpoints:
   POST /api/auth/register → register(@Valid @RequestBody RegisterRequest) → ResponseEntity<AuthResponse> 201
   POST /api/auth/login → login(@Valid @RequestBody LoginRequest) → ResponseEntity<AuthResponse> 200
   POST /api/auth/refresh-token → refreshToken(@Valid @RequestBody RefreshTokenRequest) → ResponseEntity<AuthResponse> 200

2. UserController.java in com.rebook.auth.controller:
   - @RestController @RequestMapping("/api/users")
   - @SecurityRequirement(name = "bearerAuth") — Swagger
   - Inject UserService
   - Extract userId from X-User-Id request header (set by Gateway)
   - Extract role from X-User-Roles request header

   Endpoints:
   GET /api/users/profile → getMyProfile(@RequestHeader("X-User-Id") Long userId) → UserResponse 200
   GET /api/users/{id} → getUserById(@PathVariable Long id) → UserResponse 200
   PUT /api/users/profile → updateProfile(@RequestHeader Long userId, @Valid @RequestBody UpdateProfileRequest) → UserResponse 200

   Admin endpoints under /api/admin/users:
   GET /api/admin/users → getAllUsers(Pageable) → Page<UserResponse> — @PreAuthorize("hasRole('ADMIN')")
   PUT /api/admin/users/{id}/ban → banUser(@PathVariable Long id) — @PreAuthorize("hasRole('ADMIN')")
   PUT /api/admin/users/{id}/unban → unbanUser(@PathVariable Long id) — @PreAuthorize("hasRole('ADMIN')")
   DELETE /api/admin/users/{id} → deleteUser(@PathVariable Long id) — @PreAuthorize("hasRole('ADMIN')")

3. GlobalExceptionHandler.java in com.rebook.auth.exception:
   - @RestControllerAdvice
   - Handle: ResourceNotFoundException → 404
   - Handle: RuntimeException → 400 with message
   - Handle: MethodArgumentNotValidException → 400 with field errors map
   - Handle: Exception → 500 with generic message
   - All responses return: { "status": int, "message": String, "timestamp": LocalDateTime }

4. Dockerfile for auth-service:
   Multi-stage build: maven:3.9-eclipse-temurin-17 → eclipse-temurin:17-jre-alpine
   Expose 8081, healthcheck /actuator/health
```

---

---

# ════════════════════════════════════════════
# PHASE 3 — BOOK SERVICE
# ════════════════════════════════════════════

---

## PROMPT 3.1 — Book Service Setup and Entities
> **Where to use:** Inside `book-service/` folder
> **Spring Initializr deps:** Web, JPA, MySQL Driver, Validation, Actuator, Eureka Client, Redis

```
Set up the Book Service for the ReBook microservices project.

Project details:
- Java 17, Maven, Spring Boot 3.x
- Group: com.rebook, Artifact: book-service, Port: 8082
- Database schema: book_db

1. pom.xml dependencies (same base as auth-service plus):
   - spring-boot-starter-web, data-jpa, validation, actuator, eureka-client
   - mysql-connector-j, lombok, mapstruct, springdoc-openapi
   - spring-boot-starter-data-redis
   - spring-kafka
   - software.amazon.awssdk:s3 (version 2.20.x) for AWS S3 image upload
   - software.amazon.awssdk:auth
   - Add AWS SDK BOM for version management

2. Create entities:

   Book.java in com.rebook.book.entity:
   - @Entity @Table(name="books") @Data @Builder @NoArgsConstructor @AllArgsConstructor
   Fields:
   @Id @GeneratedValue Long id
   @NotBlank String title
   @NotBlank String author
   String publisher
   String isbn
   String keywords
   @Enumerated(EnumType.STRING) BookCategory category
   @Enumerated(EnumType.STRING) BookCondition condition
   String city
   Double latitude
   Double longitude
   boolean isDonation
   boolean isLending
   @Enumerated(EnumType.STRING) BookStatus status  (AVAILABLE, REQUESTED, BORROWED)
   Long ownerId  (FK to auth-service User — stored as plain Long, no JPA join)
   Integer requestCount (default 0) — for popularity ranking
   @CreationTimestamp LocalDateTime createdAt
   @OneToMany(mappedBy="book", cascade=ALL, orphanRemoval=true) List<BookImage> images

   BookImage.java:
   - @Entity, @Table(name="book_images")
   - Long id, @ManyToOne Book book, String imageUrl, String imageKey (S3 key), boolean isCover

   BookCategory.java enum:
   ENGINEERING, MEDICAL, NOVELS, SCHOOL, COMPETITIVE_EXAMS, SELF_HELP, STORY_BOOKS, HISTORY, LANGUAGE, OTHER

   BookCondition.java enum:
   NEW, USED_GOOD, USED_OLD

   BookStatus.java enum:
   AVAILABLE, REQUESTED, BORROWED

3. application.yml:
   server.port: 8082
   spring.application.name: book-service
   MySQL: book_db schema
   Redis: spring.data.redis.host=localhost, port=6379
   spring.cache.type: redis
   spring.cache.redis.time-to-live: 600000 (10 min)
   Kafka: spring.kafka.bootstrap-servers=localhost:9092
   AWS: app.aws.bucket-name, app.aws.region (read from env)
   Eureka, Actuator, Swagger config same as auth-service
```

---

## PROMPT 3.2 — Book DTOs, Mapper, Repository
> **Where to use:** `book-service/src/main/java/com/rebook/book/`
> **Open file context:** Book.java, BookImage.java, all enums

```
Create DTOs, MapStruct mapper, and Repository for the ReBook Book Service.

1. Request DTOs in com.rebook.book.dto.request:

   CreateBookRequest.java:
   - @NotBlank String title, author
   - String publisher, isbn, keywords
   - @NotNull BookCategory category
   - @NotNull BookCondition condition
   - @NotBlank String city
   - Double latitude, longitude
   - boolean isDonation, isLending (at least one must be true — add @AssertTrue validator)

   UpdateBookRequest.java: same fields, all optional (no @NotBlank)

   BookSearchRequest.java (for search filters):
   - String keyword, author, publisher, isbn
   - BookCategory category
   - BookCondition condition
   - String city
   - Double userLatitude, userLongitude
   - Double radiusKm (default 50.0)
   - Boolean isDonation, isLending
   - int page (default 0), int size (default 10)
   - String sortBy (default "createdAt"), String sortDir (default "desc")

2. Response DTOs in com.rebook.book.dto.response:

   BookResponse.java:
   - All Book fields including computed distance (Double distanceKm — set manually)
   - List<String> imageUrls (cover first)
   - String coverImageUrl
   - String ownerName (fetched separately — leave as String, set by service)

   BookImageResponse.java: Long id, String imageUrl, boolean isCover

3. BookRepository.java in com.rebook.book.repository:
   - Extends JpaRepository<Book, Long> and JpaSpecificationExecutor<Book>
   - List<Book> findByOwnerIdAndStatus(Long ownerId, BookStatus status)
   - Page<Book> findByOwnerId(Long ownerId, Pageable pageable)
   - @Modifying @Query to update status: UPDATE Book b SET b.status = :status WHERE b.id = :id
   - @Modifying @Query to increment requestCount: UPDATE Book b SET b.requestCount = b.requestCount + 1 WHERE b.id = :id
   - Native query using Haversine formula for geo-distance search:
     SELECT *, (6371 * acos(cos(radians(:lat)) * cos(radians(b.latitude)) * cos(radians(b.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(b.latitude)))) AS distance
     FROM books b WHERE status = 'AVAILABLE' HAVING distance < :radiusKm ORDER BY distance
     Returns List<Object[]>

4. BookMapper.java in com.rebook.book.mapper:
   - @Mapper(componentModel="spring")
   - BookResponse toResponse(Book book)
   - List<BookResponse> toResponseList(List<Book> books)
   - @Mapping(target="id", ignore=true) @Mapping(target="status", ignore=true) @Mapping(target="ownerId", ignore=true)
   - void updateBookFromRequest(UpdateBookRequest req, @MappingTarget Book book)
```

---

## PROMPT 3.3 — AWS S3 Service
> **Where to use:** `book-service/src/main/java/com/rebook/book/service/`
> **Open file context:** application.yml

```
Create the AWS S3 image upload service for the ReBook Book Service.

1. AwsS3Config.java in com.rebook.book.config:
   - @Configuration
   - @Value("${app.aws.region}") String region
   - @Value("${app.aws.bucket-name}") String bucketName
   - S3Client bean: S3Client.builder().region(Region.of(region)).build()
     (Uses default credential chain — IAM role on EC2, or env vars AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY for local)

2. S3Service.java in com.rebook.book.service:
   - @Service with S3Client and bucket name injected
   
   Methods:
   
   String uploadFile(MultipartFile file, String folder):
   - Validate file: only allow image/jpeg, image/png, image/webp
   - Max file size: 5MB
   - Generate unique key: folder + "/" + UUID + "." + extension
   - Upload using PutObjectRequest with content type
   - Return public URL: https://{bucketName}.s3.amazonaws.com/{key}
   
   String uploadPdf(MultipartFile file):
   - Similar to uploadFile but allows application/pdf
   - Folder: "pdfs"
   
   void deleteFile(String imageKey):
   - Delete object from S3 by key
   - Log warning if delete fails (don't throw)
   
   private String extractExtension(String filename): return extension from filename
   private void validateImageFile(MultipartFile file): throw IllegalArgumentException if invalid
```

---

## PROMPT 3.4 — Book Service Business Logic
> **Where to use:** `book-service/src/main/java/com/rebook/book/service/`
> **Open file context:** Book.java, BookRepository.java, S3Service.java, BookMapper.java, all DTOs

```
Create the BookService for the ReBook Book Service with full business logic.

BookService.java in com.rebook.book.service:
- @Service @Transactional with constructor injection
- Inject: BookRepository, BookMapper, S3Service, RedisTemplate, KafkaTemplate

Methods:

1. BookResponse createBook(CreateBookRequest request, List<MultipartFile> images, Long ownerId):
   - Validate at least one of isDonation or isLending is true
   - Save book entity with status=AVAILABLE, ownerId from header
   - Upload each image to S3: folder "books/{bookId}"
   - First image = isCover=true, rest = isCover=false
   - Save BookImage entities
   - Evict Redis cache key "books:popular" and "books:search:*"
   - Publish Kafka event to topic "book-events": { eventType: "BOOK_ADDED", bookId, ownerId }
   - Return BookResponse

2. BookResponse updateBook(Long bookId, UpdateBookRequest request, List<MultipartFile> newImages, Long requesterId):
   - Load book, verify ownerId == requesterId (else throw 403 Forbidden)
   - Update fields, save
   - If newImages provided: delete old images from S3, upload new ones
   - Evict relevant Redis cache
   - Return updated BookResponse

3. void deleteBook(Long bookId, Long requesterId, String requesterRole):
   - Load book, verify ownerId == requesterId OR requesterRole == ROLE_ADMIN
   - Delete all images from S3
   - Delete book
   - Publish Kafka event: { eventType: "BOOK_DELETED", bookId }
   - Evict Redis cache

4. BookResponse getBookById(Long bookId):
   - Load book with images, map to response
   - Set imageUrls list (cover first)

5. @Cacheable(value="books", key="'popular'")
   List<BookResponse> getPopularBooks():
   - Find top 10 books by requestCount desc where status=AVAILABLE
   - Return mapped list

6. Page<BookResponse> searchBooks(BookSearchRequest searchRequest):
   - Use JPA Specification to build dynamic WHERE clause:
     * If keyword: title LIKE or author LIKE or keywords LIKE
     * If category: category = ?
     * If condition: condition = ?
     * If isDonation: isDonation = true
     * If isLending: isLending = true
     * Always: status = AVAILABLE
   - If userLatitude and userLongitude and radiusKm provided: use Haversine native query and filter results
   - Return paginated result

7. List<BookResponse> getBooksByOwner(Long ownerId, Pageable pageable):
   - Find all books by ownerId, return mapped

8. List<BookResponse> getBooksByCategory(BookCategory category, Pageable pageable):
   - For recommendation use

9. void updateBookStatus(Long bookId, BookStatus newStatus):
   - Used internally by Request Service events
   - Update status, evict cache
```

---

## PROMPT 3.5 — Book Controller
> **Where to use:** `book-service/src/main/java/com/rebook/book/controller/`
> **Open file context:** BookService.java, all DTOs

```
Create the BookController and RecommendationController for the ReBook Book Service.

1. BookController.java in com.rebook.book.controller:
   - @RestController @RequestMapping("/api/books")
   - @Tag(name = "Books") — Swagger

   Endpoints:
   POST /api/books (multipart/form-data):
   - @RequestPart CreateBookRequest bookRequest
   - @RequestPart(required=false) List<MultipartFile> images
   - @RequestHeader("X-User-Id") Long userId
   - Returns: ResponseEntity<BookResponse> 201

   GET /api/books/{id} → getBookById → BookResponse 200

   PUT /api/books/{id} (multipart/form-data):
   - @RequestPart UpdateBookRequest, optional images, @RequestHeader userId
   - Returns: BookResponse 200

   DELETE /api/books/{id}:
   - @RequestHeader X-User-Id, @RequestHeader X-User-Roles
   - Returns: 204 No Content

   GET /api/books/search:
   - @ModelAttribute BookSearchRequest (all params from query string)
   - Returns: Page<BookResponse> 200

   GET /api/books/my:
   - @RequestHeader X-User-Id, Pageable
   - Returns: Page<BookResponse> 200

   GET /api/books/popular:
   - Returns: List<BookResponse> 200 (cached)

   PATCH /api/books/{id}/status (internal use by other services):
   - @RequestParam BookStatus status
   - No auth header needed (called service-to-service)
   - Returns: 200 OK

2. RecommendationController.java:
   - @RestController @RequestMapping("/api/recommendations")
   
   GET /api/recommendations/{bookId}:
   - Load book by id, get its category and author
   - Return top 6 books: same category OR same author, excluding the bookId, status=AVAILABLE
   - Returns: List<BookResponse>

3. GlobalExceptionHandler.java: same pattern as auth-service
   Add: handle IllegalArgumentException → 400, handle AccessDeniedException → 403
```

---

---

# ════════════════════════════════════════════
# PHASE 4 — REQUEST SERVICE
# ════════════════════════════════════════════

---

## PROMPT 4.1 — Request Service Setup and Entities
> **Where to use:** Inside `request-service/` folder

```
Set up the Request Service for the ReBook microservices project.

Project details:
- Java 17, Maven, Spring Boot 3.x
- Group: com.rebook, Artifact: request-service, Port: 8083
- Database schema: request_db

1. pom.xml: same base deps + spring-kafka, spring-boot-starter-web, JPA, MySQL, Lombok, MapStruct, Swagger, Actuator, Eureka, Validation

2. Create entities:

BookRequest.java in com.rebook.request.entity:
- @Entity @Table(name="book_requests")
- Long id (PK)
- Long bookId (references book-service)
- Long senderId (who is requesting)
- Long receiverId (book owner)
- @Enumerated RequestType requestType (DONATION, LENDING)
- @Enumerated RequestStatus status (PENDING, APPROVED, REJECTED, CANCELLED)
- Integer noOfWeeks (for lending only)
- LocalDate borrowDate
- LocalDate dueDate
- @Enumerated ReturnStatus returnStatus (RETURNED, NOT_RETURNED, PENDING)
- @CreationTimestamp LocalDateTime createdAt

Review.java in com.rebook.request.entity:
- @Entity @Table(name="reviews")
- Long id
- Long requestId (FK to BookRequest)
- Long reviewerId (who is rating)
- Long reviewedUserId (who is being rated)
- @Min(1) @Max(5) Integer rating
- String comment
- @CreationTimestamp LocalDateTime createdAt

RequestType.java enum: DONATION, LENDING
RequestStatus.java enum: PENDING, APPROVED, REJECTED, CANCELLED
ReturnStatus.java enum: PENDING, RETURNED, NOT_RETURNED

3. application.yml:
   server.port: 8083
   MySQL: request_db
   spring.kafka.bootstrap-servers=localhost:9092
   app.book-service.url: http://book-service (for Feign/RestTemplate calls)
   All standard configs (Eureka, Actuator, Swagger)
```

---

## PROMPT 4.2 — Request DTOs, Repository, Kafka Events
> **Where to use:** `request-service/src/main/java/com/rebook/request/`
> **Open file context:** BookRequest.java, Review.java

```
Create DTOs, repositories, and Kafka event classes for the ReBook Request Service.

1. Request DTOs in com.rebook.request.dto.request:

   CreateRequestDto.java:
   - @NotNull Long bookId
   - @NotNull RequestType requestType
   - Integer noOfWeeks (required if requestType=LENDING, @Min(1) @Max(52))

   UpdateReturnStatusDto.java:
   - @NotNull ReturnStatus returnStatus

   CreateReviewDto.java:
   - @NotNull Long requestId
   - @NotNull Long reviewedUserId
   - @NotNull @Min(1) @Max(5) Integer rating
   - String comment

2. Response DTOs:

   BookRequestResponse.java:
   - All fields from BookRequest entity
   - String senderName, String receiverName (populated by service)
   - String bookTitle (populated by service)

   ReviewResponse.java: all fields from Review

3. Repositories:

   BookRequestRepository.java (JpaRepository<BookRequest, Long>):
   - Page<BookRequest> findBySenderId(Long senderId, Pageable pageable)
   - Page<BookRequest> findByReceiverId(Long receiverId, Pageable pageable)
   - Optional<BookRequest> findByBookIdAndSenderIdAndStatusIn(Long bookId, Long senderId, List<RequestStatus> statuses)
   - boolean existsByBookIdAndStatusIn(Long bookId, List<RequestStatus> statuses)

   ReviewRepository.java (JpaRepository<Review, Long>):
   - List<Review> findByReviewedUserId(Long userId)
   - boolean existsByRequestIdAndReviewerId(Long requestId, Long reviewerId)

4. Kafka event classes in com.rebook.request.event:

   BookRequestEvent.java:
   - @Data @Builder @NoArgsConstructor @AllArgsConstructor
   - String eventType (REQUEST_CREATED, REQUEST_APPROVED, REQUEST_REJECTED, REQUEST_RETURNED, REQUEST_CANCELLED)
   - Long requestId
   - Long bookId
   - Long senderId
   - Long receiverId
   - RequestType requestType
   - String bookTitle
   - LocalDateTime timestamp

   KafkaTopicConfig.java in com.rebook.request.config:
   - @Configuration
   - @Bean NewTopic requestEventsTopic(): TopicBuilder.name("request-events").partitions(1).replicas(1).build()
   - @Bean NewTopic bookEventsTopic(): for "book-events" topic (consumer)

5. KafkaProducerConfig.java:
   - ProducerFactory<String, BookRequestEvent> with JsonSerializer
   - KafkaTemplate<String, BookRequestEvent> bean
```

---

## PROMPT 4.3 — Request Service Business Logic
> **Where to use:** `request-service/src/main/java/com/rebook/request/service/`
> **Open file context:** BookRequest.java, all DTOs, repositories, BookRequestEvent.java

```
Create the RequestService and ReviewService for the ReBook Request Service.

1. RequestService.java in com.rebook.request.service:
   - @Service @Transactional
   - Inject: BookRequestRepository, ReviewRepository, KafkaTemplate, RestTemplate (for book-service calls)

   Methods:

   BookRequestResponse createRequest(CreateRequestDto dto, Long senderId):
   - Call book-service GET /api/books/{bookId} via RestTemplate to get book details
   - Validate: book must exist, status must be AVAILABLE, senderId != book.ownerId
   - Validate: no existing PENDING request from same sender for same book
   - If requestType=LENDING: noOfWeeks required
   - Create BookRequest: status=PENDING, receiverId=book.ownerId
   - Save request
   - Call book-service PATCH /api/books/{bookId}/status?status=REQUESTED
   - Publish Kafka event: REQUEST_CREATED
   - Return mapped response

   BookRequestResponse approveRequest(Long requestId, Long approverId):
   - Load request, verify receiverId == approverId (only owner can approve)
   - Verify status is PENDING
   - Update status = APPROVED
   - If LENDING: set borrowDate=today, dueDate=today+noOfWeeks weeks
   - Call book-service to update status = BORROWED
   - Publish Kafka event: REQUEST_APPROVED
   - Return updated response

   BookRequestResponse rejectRequest(Long requestId, Long rejecterId):
   - Load request, verify receiverId == rejecterId
   - Verify status is PENDING
   - Update status = REJECTED
   - Call book-service to update status = AVAILABLE
   - Publish Kafka event: REQUEST_REJECTED
   - Return updated response

   BookRequestResponse cancelRequest(Long requestId, Long requesterId):
   - Load request, verify senderId == requesterId
   - Verify status is PENDING (can only cancel before approval)
   - Update status = CANCELLED
   - Call book-service to update status = AVAILABLE
   - Publish Kafka event: REQUEST_CANCELLED
   - Return updated response

   BookRequestResponse updateReturnStatus(Long requestId, Long ownerId, UpdateReturnStatusDto dto):
   - Load request, verify receiverId == ownerId
   - Verify status is APPROVED
   - Update returnStatus
   - If RETURNED: Call book-service to update status = AVAILABLE, publish REQUEST_RETURNED event
   - Return updated response

   Page<BookRequestResponse> getSentRequests(Long userId, Pageable pageable)
   Page<BookRequestResponse> getReceivedRequests(Long userId, Pageable pageable)

2. ReviewService.java:
   - ReviewResponse createReview(CreateReviewDto dto, Long reviewerId):
     * Load request, verify it's APPROVED and returnStatus=RETURNED
     * Verify reviewerId is sender (only borrower reviews owner)
     * Check no existing review for this request
     * Save review
     * (Optionally: publish event to update user's average rating in auth-service)
   - List<ReviewResponse> getReviewsForUser(Long userId)
```

---

## PROMPT 4.4 — Request Controller
> **Where to use:** `request-service/src/main/java/com/rebook/request/controller/`
> **Open file context:** RequestService.java, ReviewService.java

```
Create REST controllers for the ReBook Request Service.

1. RequestController.java in com.rebook.request.controller:
   - @RestController @RequestMapping("/api/requests")
   - @SecurityRequirement(name = "bearerAuth")

   POST /api/requests:
   - @RequestBody CreateRequestDto, @RequestHeader("X-User-Id") Long userId
   - Returns: ResponseEntity<BookRequestResponse> 201

   GET /api/requests/sent:
   - @RequestHeader userId, Pageable
   - Returns: Page<BookRequestResponse>

   GET /api/requests/received:
   - @RequestHeader userId, Pageable
   - Returns: Page<BookRequestResponse>

   PUT /api/requests/{id}/approve:
   - @RequestHeader userId → approverId
   - Returns: BookRequestResponse

   PUT /api/requests/{id}/reject:
   - @RequestHeader userId → rejecterId
   - Returns: BookRequestResponse

   PUT /api/requests/{id}/cancel:
   - @RequestHeader userId
   - Returns: BookRequestResponse

   PUT /api/requests/{id}/return-status:
   - @RequestBody UpdateReturnStatusDto, @RequestHeader userId
   - Returns: BookRequestResponse

2. ReviewController.java:
   - @RestController @RequestMapping("/api/reviews")

   POST /api/reviews:
   - @RequestBody CreateReviewDto, @RequestHeader userId
   - Returns: ReviewResponse 201

   GET /api/reviews/user/{userId}:
   - Returns: List<ReviewResponse>

3. GlobalExceptionHandler.java: same pattern, add IllegalStateException → 400
```

---

---

# ════════════════════════════════════════════
# PHASE 5 — NOTIFICATION SERVICE
# ════════════════════════════════════════════

---

## PROMPT 5.1 — Notification Service Setup and Entity
> **Where to use:** Inside `notification-service/` folder

```
Set up the Notification Service for the ReBook microservices project.

Project details:
- Java 17, Maven, Spring Boot 3.x
- Group: com.rebook, Artifact: notification-service, Port: 8085
- Database schema: notification_db
- This service is purely event-driven — it has NO REST endpoints except GET notifications for a user

1. pom.xml: base deps + spring-kafka, spring-boot-starter-mail, Lombok, JPA, MySQL, Actuator, Eureka, Swagger, MapStruct

2. Entity — Notification.java in com.rebook.notification.entity:
   - @Entity @Table(name="notifications")
   - Long id
   - Long userId (recipient)
   - String title
   - String message
   - @Enumerated NotificationType type (REQUEST_RECEIVED, REQUEST_APPROVED, REQUEST_REJECTED, REQUEST_RETURNED, RETURN_REMINDER, NEW_MESSAGE, SYSTEM)
   - boolean isRead (default false)
   - Long referenceId (requestId or bookId — generic reference)
   - @CreationTimestamp LocalDateTime createdAt

3. NotificationRepository.java:
   - Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable)
   - List<Notification> findByUserIdAndIsReadFalse(Long userId)
   - long countByUserIdAndIsReadFalse(Long userId)
   - @Modifying @Query: mark all as read for userId
   - @Modifying @Query: mark single notification as read by id and userId

4. application.yml:
   server.port: 8085
   MySQL: notification_db
   spring.kafka.bootstrap-servers=localhost:9092
   spring.kafka.consumer.group-id=notification-service
   spring.kafka.consumer.auto-offset-reset=earliest
   spring.mail.host=smtp.gmail.com
   spring.mail.port=587
   spring.mail.username: ${MAIL_USERNAME}
   spring.mail.password: ${MAIL_PASSWORD}
   spring.mail.properties.mail.smtp.auth=true
   spring.mail.properties.mail.smtp.starttls.enable=true
   app.auth-service.url: http://auth-service (to get user email by id)
   Eureka, Actuator standard configs
```

---

## PROMPT 5.2 — Kafka Consumer and Email Service
> **Where to use:** `notification-service/src/main/java/com/rebook/notification/`
> **Open file context:** Notification.java, NotificationRepository.java, application.yml

```
Create the Kafka consumer, email service, and notification service for the ReBook Notification Service.

1. BookRequestEvent.java in com.rebook.notification.event (copy from request-service):
   - Same structure: eventType, requestId, bookId, senderId, receiverId, requestType, bookTitle, timestamp

2. EmailService.java in com.rebook.notification.service:
   - @Service, inject JavaMailSender, @Value("${spring.mail.username}") String from
   
   Methods:
   - void sendSimpleEmail(String to, String subject, String body)
   - void sendRequestCreatedEmail(String ownerEmail, String ownerName, String bookTitle, String senderName)
   - void sendRequestApprovedEmail(String senderEmail, String senderName, String bookTitle)
   - void sendRequestRejectedEmail(String senderEmail, String senderName, String bookTitle)
   - void sendReturnReminderEmail(String borrowerEmail, String borrowerName, String bookTitle, LocalDate dueDate)
   - void sendRequestReturnedEmail(String ownerEmail, String ownerName, String bookTitle)
   
   Each method builds a proper HTML email string (simple template with greeting, body, footer)
   Wrap all sends in try-catch and log errors (don't throw — email failure shouldn't crash the consumer)

3. UserLookupService.java in com.rebook.notification.service:
   - @Service, inject RestTemplate
   - UserInfo getUserById(Long userId): calls auth-service GET /api/users/{id}
   - Create UserInfo record: Long id, String name, String email
   - Cache results with @Cacheable to avoid repeated calls

4. NotificationService.java in com.rebook.notification.service:
   - @Service @Transactional
   - Inject: NotificationRepository, EmailService, UserLookupService

   Methods:
   - Notification createNotification(Long userId, String title, String message, NotificationType type, Long referenceId)
   - Page<Notification> getNotificationsForUser(Long userId, Pageable pageable)
   - long getUnreadCount(Long userId)
   - void markAsRead(Long notificationId, Long userId)
   - void markAllAsRead(Long userId)

5. RequestEventConsumer.java in com.rebook.notification.consumer:
   - @Component
   - @KafkaListener(topics = "request-events", groupId = "notification-service")
   - Consume BookRequestEvent, deserialize from JSON
   
   Handle each eventType:
   REQUEST_CREATED:
   - Fetch owner (receiverId) user info
   - Fetch sender user info
   - Save in-app notification for owner
   - Send email to owner: "You have a new request for [bookTitle] from [senderName]"
   
   REQUEST_APPROVED:
   - Save in-app notification for sender
   - Send email to sender: "Your request for [bookTitle] was approved!"
   
   REQUEST_REJECTED:
   - Save in-app notification for sender
   - Send email to sender: "Your request for [bookTitle] was not approved."
   
   REQUEST_RETURNED:
   - Save in-app notification for owner
   - Send email to owner: "Your book [bookTitle] has been marked as returned."
   
   REQUEST_CANCELLED:
   - Save in-app notification for owner
   - Log the cancellation

6. ReturnReminderScheduler.java in com.rebook.notification.scheduler:
   - @Component @EnableScheduling
   - @Scheduled(cron = "0 0 9 * * *") — runs every day at 9 AM
   - Call request-service GET /api/requests/overdue-soon (create this endpoint)
   - For each result: send return reminder email and save in-app notification
   - (Alternatively: query notification_db for requests with dueDate = today + 2 days — but since we don't own that table, just document this as a future improvement and log a stub message for now)

7. NotificationController.java:
   GET /api/notifications → getMyNotifications(@RequestHeader userId, Pageable)
   GET /api/notifications/unread-count → getUnreadCount(@RequestHeader userId)
   PUT /api/notifications/{id}/read → markAsRead
   PUT /api/notifications/read-all → markAllAsRead
```

---

---

# ════════════════════════════════════════════
# PHASE 6 — CHAT SERVICE
# ════════════════════════════════════════════

---

## PROMPT 6.1 — Chat Service Setup, Entity, and Config
> **Where to use:** Inside `chat-service/` folder

```
Set up the Chat Service for the ReBook microservices project with WebSocket support.

Project details:
- Java 17, Maven, Spring Boot 3.x
- Group: com.rebook, Artifact: chat-service, Port: 8084
- Database schema: chat_db

1. pom.xml dependencies:
   - spring-boot-starter-web
   - spring-boot-starter-websocket
   - spring-boot-starter-data-jpa
   - spring-boot-starter-security (for WebSocket JWT auth)
   - mysql-connector-j
   - lombok, mapstruct, springdoc-openapi, actuator, eureka-client
   - jjwt-api, jjwt-impl, jjwt-jackson (0.11.5) — for validating JWT in WebSocket handshake

2. Message.java entity in com.rebook.chat.entity:
   - @Entity @Table(name="messages")
   - Long id
   - Long requestId (messages belong to a request conversation)
   - Long senderId
   - Long receiverId
   - @Column(columnDefinition="TEXT") String content
   - boolean isRead (default false)
   - @CreationTimestamp LocalDateTime createdAt

3. MessageRepository.java:
   - List<Message> findByRequestIdOrderByCreatedAtAsc(Long requestId)
   - Page<Message> findByRequestIdOrderByCreatedAtDesc(Long requestId, Pageable pageable)
   - List<Message> findByReceiverIdAndIsReadFalse(Long receiverId)
   - @Modifying @Query: mark all messages as read for requestId and receiverId
   - Native query to get inbox: distinct requestIds with latest message per requestId for a userId (sender or receiver)

4. WebSocketConfig.java in com.rebook.chat.config:
   - @Configuration @EnableWebSocketMessageBroker
   - Implements WebSocketMessageBrokerConfigurer
   - configureMessageBroker: enable simple broker "/topic", "/queue"; set app destination prefix "/app"
   - registerStompEndpoints: "/ws" endpoint with SockJS fallback; allow all origins "*"

5. WebSocketSecurityConfig.java in com.rebook.chat.config:
   - @Configuration
   - Implement ChannelInterceptor for inbound messages
   - On CONNECT frame: extract JWT from Authorization or passcode header
   - Validate JWT using JwtUtil (same as auth-service)
   - Set authentication in SecurityContextHolder for the WebSocket session
   - If token invalid: throw AccessDeniedException to reject connection

6. JwtUtil.java in com.rebook.chat.security:
   - Same as auth-service JwtUtil — extract userId and role from token
   - @Value("${app.jwt.secret}") — same secret as other services

7. application.yml:
   server.port: 8084
   MySQL: chat_db
   app.jwt.secret: same value as other services (via env variable)
   Spring Security: disable for REST endpoints (JWT handled at gateway), but keep for WebSocket
```

---

## PROMPT 6.2 — Chat Service Business Logic and WebSocket Handler
> **Where to use:** `chat-service/src/main/java/com/rebook/chat/`
> **Open file context:** Message.java, MessageRepository.java, WebSocketConfig.java

```
Create the message service, WebSocket handler, and REST controller for the ReBook Chat Service.

1. DTOs in com.rebook.chat.dto:

   SendMessageRequest.java:
   - @NotNull Long requestId
   - @NotNull Long receiverId
   - @NotBlank String content

   MessageResponse.java:
   - Long id, Long requestId, Long senderId, Long receiverId
   - String content, boolean isRead, LocalDateTime createdAt

   ChatPreview.java (for inbox):
   - Long requestId
   - Long otherUserId
   - String lastMessage
   - LocalDateTime lastMessageTime
   - int unreadCount

2. MessageService.java in com.rebook.chat.service:
   - @Service @Transactional
   - Inject MessageRepository, MessageMapper, SimpMessagingTemplate

   Methods:
   
   MessageResponse sendMessage(SendMessageRequest request, Long senderId):
   - Create and save Message entity
   - Use SimpMessagingTemplate to send to WebSocket topic:
     template.convertAndSendToUser(receiverId.toString(), "/queue/messages", messageResponse)
   - Return saved MessageResponse
   
   List<MessageResponse> getMessagesByRequestId(Long requestId, Long userId):
   - Load messages, mark unread ones as read (where receiverId == userId)
   - Return ordered list
   
   List<ChatPreview> getInbox(Long userId):
   - Get distinct requestIds where senderId or receiverId = userId
   - For each: get latest message, unread count
   - Return sorted by lastMessageTime desc
   
   void markAsRead(Long requestId, Long userId):
   - Mark all messages in this conversation as read where receiverId = userId

3. ChatController.java in com.rebook.chat.controller:
   REST endpoints:
   POST /api/messages → sendMessage(@RequestBody, @RequestHeader userId)
   GET /api/messages/{requestId} → getMessages(@PathVariable, @RequestHeader userId)
   GET /api/messages/inbox → getInbox(@RequestHeader userId)
   PUT /api/messages/{requestId}/read → markAsRead(@PathVariable, @RequestHeader userId)

   WebSocket endpoints (using @MessageMapping):
   @MessageMapping("/chat.send") → handleWebSocketMessage(SendMessageRequest, Principal):
   - Extract senderId from Principal (set during WebSocket auth)
   - Call messageService.sendMessage
   - Broadcast to /topic/requests/{requestId} for group visibility
   - Also send to specific user /queue/messages
```

---

---

# ════════════════════════════════════════════
# PHASE 7 — RAG SERVICE (AI Integration)
# ════════════════════════════════════════════

---

## PROMPT 7.1 — RAG Service Setup
> **Where to use:** Inside `rag-service/` folder

```
Set up the RAG (Retrieval Augmented Generation) Service for the ReBook project.
This service integrates with the existing Spring AI + OpenAI setup.

Project details:
- Java 17, Maven, Spring Boot 3.x
- Group: com.rebook, Artifact: rag-service, Port: 8086
- Database: rag_db (MySQL for metadata) + PgVector or simple in-memory vector store for dev

1. pom.xml dependencies:
   - spring-boot-starter-web
   - spring-ai-openai-spring-boot-starter (milestone version compatible with Spring Boot 3)
   - spring-ai-pgvector-store-spring-boot-starter (or spring-ai-chroma-store-spring-boot-starter)
   - spring-boot-starter-data-jpa
   - mysql-connector-j
   - apache pdfbox: org.apache.pdfbox:pdfbox:3.0.x (PDF text extraction)
   - lombok, springdoc-openapi, actuator, eureka-client
   - Add Spring AI BOM for version management:
     <dependencyManagement> spring-ai-bom 1.0.0-M6 (or latest milestone)

2. BookEmbedding.java entity in com.rebook.rag.entity:
   - @Entity @Table(name="book_embeddings_meta")
   - Long id
   - Long bookId (reference to book-service)
   - String bookTitle
   - String documentKey (S3 key of the PDF)
   - Integer chunkCount
   - boolean isIndexed
   - @CreationTimestamp LocalDateTime indexedAt

3. application.yml:
   server.port: 8086
   spring.ai.openai.api-key: ${OPENAI_API_KEY}
   spring.ai.openai.chat.options.model: gpt-4o-mini
   spring.ai.openai.embedding.options.model: text-embedding-ada-002
   spring.ai.vectorstore.pgvector.dimensions: 1536
   (For local dev without PgVector: use SimpleVectorStore)
   MySQL: rag_db
   Eureka, Actuator standard configs

4. VectorStoreConfig.java in com.rebook.rag.config:
   - For development: @Bean SimpleVectorStore simpleVectorStore(EmbeddingModel embeddingModel)
   - Add comment: "Replace with PgVectorStore for production"
   - @ConditionalOnMissingBean to avoid conflict

5. AwsS3Config.java: same as book-service for downloading PDFs from S3
```

---

## PROMPT 7.2 — RAG Ingestion and Query Service
> **Where to use:** `rag-service/src/main/java/com/rebook/rag/`
> **Open file context:** BookEmbedding.java, application.yml, VectorStoreConfig.java

```
Create the PDF ingestion pipeline and AI query service for the ReBook RAG Service.

1. DTOs in com.rebook.rag.dto:

   IngestRequest.java:
   - @NotNull Long bookId
   - @NotBlank String bookTitle
   - @NotBlank String pdfS3Key (key to download from S3)

   AskRequest.java:
   - @NotNull Long bookId
   - @NotBlank String question

   AskResponse.java:
   - String answer
   - Long bookId
   - String bookTitle
   - List<String> sourcedFrom (chunk references)

2. DocumentIngestionService.java in com.rebook.rag.service:
   - @Service, inject VectorStore, EmbeddingModel, S3Client, BookEmbeddingRepository

   Methods:
   
   void ingestBookPdf(IngestRequest request):
   - Download PDF from S3 using S3Client (getObject → byte[])
   - Parse PDF using PDFBox: PDDocument.load(bytes) → PDFTextStripper → full text string
   - Split text into chunks of ~800 characters with 100 char overlap:
     * Find nearest paragraph break or sentence end
     * Create list of String chunks
   - For each chunk: create Document with metadata {bookId, bookTitle, chunkIndex}
   - Add all documents to VectorStore (vectorStore.add(documents))
   - Save BookEmbedding metadata to MySQL (chunk count, indexed=true)
   - Log success: "Indexed N chunks for book [bookTitle]"
   
   private List<String> splitIntoChunks(String text, int chunkSize, int overlap):
   - Implement sliding window chunking
   - Return list of text chunks

3. RagQueryService.java in com.rebook.rag.service:
   - @Service, inject VectorStore, ChatModel (OpenAI)
   
   AskResponse askAboutBook(AskRequest request):
   - Search vector store with metadata filter: bookId = request.getBookId()
   - SearchRequest.query(request.getQuestion()).withTopK(5).withSimilarityThreshold(0.7)
     with filter: FilterExpressionBuilder: b.eq("bookId", request.getBookId().toString())
   - If no results: return "No information found for this book."
   - Build prompt:
     "You are a helpful assistant. Answer the question based ONLY on the following context.
      If the answer is not in the context, say 'I don't have enough information from this book to answer.'
      
      Context: [joined chunk texts]
      
      Question: [user question]"
   - Call chatModel.call(prompt) → get response string
   - Return AskResponse with answer, bookId, bookTitle

4. RagController.java in com.rebook.rag.controller:
   
   POST /api/ai/ingest:
   - @RequestBody IngestRequest
   - No auth required (called internally by book-service after PDF upload)
   - Returns: 202 Accepted with message "Ingestion started"
   - Run ingestion async: @Async

   POST /api/ai/ask:
   - @RequestBody AskRequest, @RequestHeader("X-User-Id") Long userId
   - Returns: ResponseEntity<AskResponse> 200

   GET /api/ai/books/{bookId}/status:
   - Returns: BookEmbedding metadata (is this book indexed?)

5. Enable @EnableAsync in RagServiceApplication.java
   Add @Async on ingestBookPdf method in DocumentIngestionService
```

---

---

# ════════════════════════════════════════════
# PHASE 8 — REACT FRONTEND
# ════════════════════════════════════════════

---

## PROMPT 8.1 — React Project Setup
> **Where to use:** `frontend-react/` folder
> **Run first:** `npm create vite@latest frontend-react -- --template react`

```
Set up the React frontend for the ReBook project.

Tech stack: React 18, Vite, Tailwind CSS, React Router v6, React Query (TanStack Query v5), Axios, SockJS + STOMP.js

1. Install all dependencies. Generate the exact npm install commands for:
   - tailwindcss, postcss, autoprefixer (with npx tailwindcss init -p)
   - @tanstack/react-query, axios
   - react-router-dom
   - sockjs-client, @stomp/stompjs
   - react-leaflet, leaflet (for map view)
   - react-hot-toast (for notifications/toasts)
   - lucide-react (for icons)
   - @headlessui/react (for modals and dropdowns)

2. Configure tailwind.config.js:
   - content: ["./index.html", "./src/**/*.{js,jsx}"]
   - Extend theme with custom colors:
     primary: { 50 to 900 shades based on #00C9A7 teal }
     secondary: { shades based on #845EF7 purple }

3. Create folder structure:
   src/
   ├── api/           (axios instances and API functions per service)
   ├── components/
   │   ├── common/    (Button, Input, Modal, Spinner, Badge, Pagination)
   │   ├── book/      (BookCard, BookGrid, BookFilter, ImageUpload)
   │   ├── request/   (RequestCard, RequestActions)
   │   ├── chat/      (ChatWindow, MessageBubble, InboxList)
   │   └── layout/    (Navbar, Sidebar, Footer, ProtectedRoute)
   ├── pages/
   │   ├── auth/      (LoginPage, RegisterPage)
   │   ├── books/     (BookListPage, BookDetailPage, AddBookPage, EditBookPage, MyBooksPage)
   │   ├── requests/  (MyRequestsPage, IncomingRequestsPage)
   │   ├── chat/      (ChatPage)
   │   ├── notifications/ (NotificationsPage)
   │   ├── admin/     (AdminDashboardPage, AdminUsersPage)
   │   └── HomePage.jsx
   ├── context/
   │   ├── AuthContext.jsx    (JWT token, current user, login/logout)
   │   └── WebSocketContext.jsx (SockJS/STOMP connection)
   ├── hooks/
   │   ├── useAuth.js
   │   ├── useWebSocket.js
   │   └── useGeolocation.js
   └── utils/
       ├── constants.js
       └── helpers.js

4. .env file:
   VITE_API_BASE_URL=http://localhost:8080
   VITE_WS_URL=http://localhost:8084/ws

5. main.jsx:
   - Wrap App in QueryClientProvider, BrowserRouter, AuthProvider, Toaster (react-hot-toast)

6. App.jsx:
   - Define all routes using React Router v6
   - Use ProtectedRoute component to guard authenticated pages
   - Routes: /, /login, /register, /books, /books/:id, /books/add, /books/edit/:id, /my-books, /requests/sent, /requests/received, /chat, /chat/:requestId, /notifications, /admin/*, /profile
```

---

## PROMPT 8.2 — Axios Setup and API Layer
> **Where to use:** `frontend-react/src/api/`
> **Open file context:** .env, AuthContext.jsx (after creating it)

```
Create the complete API layer for the ReBook React frontend.

1. src/api/axiosInstance.js:
   - Create axios instance with baseURL from VITE_API_BASE_URL
   - Request interceptor: attach JWT token from localStorage to Authorization header as "Bearer {token}"
   - Response interceptor:
     * On 401: attempt token refresh using /api/auth/refresh-token with refreshToken from localStorage
     * If refresh succeeds: update localStorage, retry original request
     * If refresh fails: clear localStorage, redirect to /login
     * On other errors: reject with error

2. src/api/authApi.js:
   - register(data): POST /api/auth/register
   - login(data): POST /api/auth/login → store tokens in localStorage
   - refreshToken(): POST /api/auth/refresh-token
   - logout(): clear localStorage tokens

3. src/api/bookApi.js:
   - getBooks(params): GET /api/books/search with query params (BookSearchRequest fields)
   - getBookById(id): GET /api/books/{id}
   - createBook(formData): POST /api/books with multipart/form-data
   - updateBook(id, formData): PUT /api/books/{id}
   - deleteBook(id): DELETE /api/books/{id}
   - getMyBooks(params): GET /api/books/my
   - getPopularBooks(): GET /api/books/popular
   - getRecommendations(bookId): GET /api/recommendations/{bookId}

4. src/api/requestApi.js:
   - createRequest(data): POST /api/requests
   - getSentRequests(params): GET /api/requests/sent
   - getReceivedRequests(params): GET /api/requests/received
   - approveRequest(id): PUT /api/requests/{id}/approve
   - rejectRequest(id): PUT /api/requests/{id}/reject
   - cancelRequest(id): PUT /api/requests/{id}/cancel
   - updateReturnStatus(id, data): PUT /api/requests/{id}/return-status
   - createReview(data): POST /api/reviews

5. src/api/chatApi.js:
   - sendMessage(data): POST /api/messages
   - getMessages(requestId): GET /api/messages/{requestId}
   - getInbox(): GET /api/messages/inbox
   - markAsRead(requestId): PUT /api/messages/{requestId}/read

6. src/api/notificationApi.js:
   - getNotifications(params): GET /api/notifications
   - getUnreadCount(): GET /api/notifications/unread-count
   - markAsRead(id): PUT /api/notifications/{id}/read
   - markAllAsRead(): PUT /api/notifications/read-all

7. src/api/aiApi.js:
   - askAboutBook(bookId, question): POST /api/ai/ask
   - getBookAiStatus(bookId): GET /api/ai/books/{bookId}/status
```

---

## PROMPT 8.3 — Auth Context and Protected Routes
> **Where to use:** `frontend-react/src/context/` and `src/components/layout/`
> **Open file context:** authApi.js, axiosInstance.js

```
Create AuthContext and ProtectedRoute for the ReBook React frontend.

1. src/context/AuthContext.jsx:
   - createContext, useContext, useState, useEffect
   - State: user (object or null), isLoading (bool)
   
   On mount: check localStorage for accessToken + user data
   If token exists: set user from localStorage (parse JSON), setIsLoading(false)
   
   login(loginData):
   - Call authApi.login(loginData)
   - Store accessToken, refreshToken in localStorage
   - Store user object (from response.user) as JSON in localStorage
   - setUser(response.user)
   - Return response

   register(registerData):
   - Call authApi.register
   - Auto-login after registration (store tokens)
   - setUser

   logout():
   - Call authApi.logout (clear localStorage)
   - setUser(null)
   - Navigate to /login

   Provide: { user, isLoading, login, register, logout, isAdmin: user?.role === 'ROLE_ADMIN' }

2. src/components/layout/ProtectedRoute.jsx:
   - If isLoading: return Spinner
   - If !user: return <Navigate to="/login" replace />
   - If requireAdmin && !isAdmin: return <Navigate to="/" replace />
   - Otherwise: return <Outlet />

3. src/components/layout/Navbar.jsx:
   - Logo "ReBook" on left
   - Search bar in center (navigates to /books?keyword=...)
   - Right side:
     * Not logged in: Login + Register buttons
     * Logged in: Notifications bell (with unread badge), My Books link, profile dropdown (My Profile, My Requests, Logout)
   - Use React Query to fetch unreadCount and poll every 30 seconds
   - Mobile: hamburger menu
   - Tailwind styling with primary teal color scheme

4. src/hooks/useAuth.js:
   export default function useAuth() { return useContext(AuthContext); }
```

---

## PROMPT 8.4 — Book Listing and Search Page
> **Where to use:** `frontend-react/src/pages/books/`
> **Open file context:** bookApi.js, BookCard component placeholder

```
Create the Book Listing and Search page for the ReBook React frontend.

1. src/components/book/BookCard.jsx:
   - Props: book (BookResponse object), onRequestClick
   - Display: cover image (fallback to placeholder), title, author, category badge
   - Status badge: AVAILABLE (green), REQUESTED (yellow), BORROWED (red)
   - Donation/Lending badges
   - City, distance (if available): "2.3 km away"
   - Owner rating: star display (averageRating)
   - Action button: "Request Book" (only if AVAILABLE and not own book)
   - Click → navigate to /books/{id}
   - Tailwind: card with hover shadow, rounded corners

2. src/components/book/BookFilter.jsx:
   - Props: filters (state), onFilterChange
   - Filter inputs:
     * Text search (keyword)
     * Category dropdown (all BookCategory values)
     * Condition dropdown (NEW, USED_GOOD, USED_OLD)
     * Type checkboxes: Donation / Lending
     * City text input
     * Radius slider: 5km, 10km, 25km, 50km (only if geolocation available)
   - "Use my location" button (triggers geolocation)
   - Apply / Reset buttons
   - Collapsible on mobile

3. src/pages/books/BookListPage.jsx:
   - useSearchParams to read/write URL query params (so search is shareable)
   - Initialize filters from URL params
   - Use useQuery (React Query) to call bookApi.getBooks(filters)
   - Show BookFilter sidebar (hidden on mobile, toggle button)
   - Show BookGrid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
   - Pagination component at bottom
   - Loading skeleton (show 6 skeleton cards while loading)
   - Empty state: "No books found — try adjusting your filters"
   - Map toggle button: switch between grid view and Leaflet map view
   - Map view: render react-leaflet MapContainer, one Marker per book, popup with BookCard mini

4. src/hooks/useGeolocation.js:
   - useState for coords (lat, lng), error, loading
   - getLocation(): calls navigator.geolocation.getCurrentPosition
   - Return { coords, error, loading, getLocation }
```

---

## PROMPT 8.5 — Book Detail Page with AI Q&A
> **Where to use:** `frontend-react/src/pages/books/`
> **Open file context:** bookApi.js, requestApi.js, aiApi.js, AuthContext

```
Create the Book Detail page with AI Q&A panel for the ReBook React frontend.

src/pages/books/BookDetailPage.jsx:

Layout: two-column on desktop (left: book info, right: AI Q&A + recommendations)

Left column:
1. Image gallery:
   - Main image (large), thumbnail strip below
   - Click thumbnail to change main image

2. Book info:
   - Title (large heading), Author, Publisher, ISBN
   - Category badge, Condition badge
   - Donation / Lending indicators with icons
   - City + distance if available
   - Owner card: name, star rating, "View Profile" link

3. Request section (only show if book is AVAILABLE and user is logged in and not owner):
   - "Request for Donation" button (if isDonation)
   - "Request to Borrow" button with weeks input (if isLending)
   - On click: open modal with CreateRequestForm
   - CreateRequestForm: requestType radio, noOfWeeks input (if LENDING), submit button
   - On submit: call requestApi.createRequest, show success toast

4. Status indicator:
   - If REQUESTED: "Someone has requested this book"
   - If BORROWED: "This book is currently borrowed"

Right column:
5. AI Q&A Panel:
   - Heading: "Ask AI About This Book" with robot icon
   - Check if book is indexed (aiApi.getBookAiStatus)
   - If indexed:
     * Question input with submit button
     * Chat-like display of Q&A history (local state — no persistence)
     * Loading spinner while waiting for AI response
     * Call aiApi.askAboutBook(bookId, question) on submit
     * Display answer in a styled bubble
   - If not indexed: "AI analysis not available for this book"
   - Show "Powered by OpenAI" badge

6. Recommendations section (below AI panel):
   - "Similar Books" heading
   - useQuery to fetch recommendations
   - Horizontal scroll of 4 BookCard mini components
   - Navigate to book detail on click

Use React Query for all data fetching, react-hot-toast for notifications.
```

---

## PROMPT 8.6 — Dashboard and Request Management Pages
> **Where to use:** `frontend-react/src/pages/requests/`
> **Open file context:** requestApi.js, AuthContext

```
Create the request management pages for the ReBook React frontend.

1. src/pages/requests/MyRequestsPage.jsx (Sent Requests):
   - Tab layout: "Sent" tab active
   - useQuery: requestApi.getSentRequests() with pagination
   - For each request show RequestCard with:
     * Book title, cover thumbnail
     * Request type badge (DONATION / LENDING)
     * Status badge (color-coded: PENDING=yellow, APPROVED=green, REJECTED=red, CANCELLED=gray)
     * Due date (if lending and approved)
     * Cancel button (only if PENDING): calls requestApi.cancelRequest, invalidate query
     * "Return status" — if APPROVED + LENDING: show current returnStatus
   - Empty state: "You haven't requested any books yet. Browse books →"

2. src/pages/requests/IncomingRequestsPage.jsx (Received Requests):
   - Shows requests where current user is the owner
   - useQuery: requestApi.getReceivedRequests()
   - For each request:
     * Requester name + rating
     * Book title
     * Request type, weeks (if lending)
     * Request date
     * If PENDING: Approve button (green) + Reject button (red)
       → confirm modal before each action
       → call approve/reject API, show toast, invalidate query
     * If APPROVED + LENDING: "Mark as Returned" / "Not Returned" buttons
       → calls requestApi.updateReturnStatus
   - Separate tabs: All / Pending / Approved / Completed

3. src/components/request/CreateRequestModal.jsx:
   - @headlessui/react Dialog
   - Props: bookId, isDonation, isLending, onClose, onSuccess
   - requestType: radio buttons (show only available types)
   - If LENDING: noOfWeeks slider (1–12 weeks) with label "for N weeks"
   - Submit: useMutation(requestApi.createRequest)
   - On success: toast + onSuccess callback + close modal

4. src/pages/HomePage.jsx:
   - Hero section: "Find Your Next Book — Share What You've Read"
   - Search bar (navigates to /books?keyword=...)
   - Popular Books section: useQuery(bookApi.getPopularBooks) → horizontal scroll
   - Categories grid: 9 category cards with icons
   - How It Works: 3 steps — Post Book, Send Request, Exchange
   - Call to action: Join + Browse buttons
```

---

## PROMPT 8.7 — Real-time Chat UI
> **Where to use:** `frontend-react/src/pages/chat/` and `src/context/`
> **Open file context:** chatApi.js, AuthContext

```
Create the real-time chat interface for the ReBook React frontend.

1. src/context/WebSocketContext.jsx:
   - createContext
   - On mount (if user is logged in): connect to SockJS/STOMP
   
   Connection:
   const socket = new SockJS(import.meta.env.VITE_WS_URL)
   const client = new Client({ webSocketFactory: () => socket })
   client.connectHeaders = { Authorization: "Bearer " + localStorage.getItem('accessToken') }
   
   On connect:
   - Subscribe to /user/queue/messages → receive real-time messages
   - setConnected(true)
   
   Methods:
   - sendMessage(messageData): client.publish({ destination: '/app/chat.send', body: JSON.stringify(messageData) })
   - subscribe(requestId, callback): subscribe to /topic/requests/{requestId}
   - unsubscribe(requestId)
   
   Cleanup on logout: client.deactivate()
   
   Provide: { connected, sendMessage, subscribe, unsubscribe }

2. src/pages/chat/ChatPage.jsx:
   - Split layout: left = inbox list, right = chat window
   - On mobile: inbox list first, tap to open chat
   
   Left panel — InboxList:
   - useQuery: chatApi.getInbox() — refresh every 15 seconds
   - Each inbox item: other user name, last message preview, unread count badge, time
   - Selected conversation highlighted
   - Click → navigate to /chat/{requestId} or set active requestId in state

3. src/pages/chat/ChatWindowPage.jsx:
   - useParams: requestId
   - useQuery: chatApi.getMessages(requestId) — initial load
   - Subscribe to WebSocket /topic/requests/{requestId} on mount
   - On new WebSocket message: append to messages list (update React Query cache)
   - Unsubscribe on unmount
   
   UI:
   - Message list (scrollable, auto-scroll to bottom on new message)
   - Each message: bubble (own messages right-aligned teal, other user left-aligned gray)
   - Timestamp below each message
   - "Read" tick for read messages
   - Bottom: textarea + send button
   - On send: call webSocketContext.sendMessage (if connected) else fall back to chatApi.sendMessage REST
   - Mark as read on open: chatApi.markAsRead(requestId)

4. src/components/chat/MessageBubble.jsx:
   - Props: message, isOwn (bool)
   - Own: right side, teal background, rounded-br-none
   - Other: left side, gray background, rounded-bl-none
   - Show: content, timestamp, read indicator
```

---

## PROMPT 8.8 — Add Book Page and Admin Pages
> **Where to use:** `frontend-react/src/pages/books/` and `src/pages/admin/`
> **Open file context:** bookApi.js, AuthContext

```
Create the Add Book page and Admin Dashboard for the ReBook React frontend.

1. src/pages/books/AddBookPage.jsx:
   - Multi-step form (Step 1: Book Details, Step 2: Images, Step 3: Availability & Location)
   
   Step 1 — Book Details:
   - Title* (required), Author* (required)
   - Publisher, ISBN
   - Keywords (tag input — press Enter to add)
   - Category dropdown, Condition dropdown
   
   Step 2 — Images:
   - Drag and drop image upload area
   - Preview thumbnails with remove button
   - Max 5 images, 5MB each
   - First image auto-set as cover
   - Reorder by drag-and-drop (optional)
   
   Step 3 — Availability:
   - "Available for Donation" toggle
   - "Available for Lending" toggle (at least one required)
   - City text input
   - "Use my location" button → fills latitude/longitude
   - Map preview showing pin at entered location (small Leaflet map)
   
   Submission:
   - Build FormData with book JSON + image files
   - useMutation(bookApi.createBook)
   - On success: navigate to /books/{newBookId} + success toast

2. src/pages/books/MyBooksPage.jsx:
   - Grid of user's own books
   - Each BookCard shows Edit and Delete buttons
   - Delete: confirm dialog → bookApi.deleteBook → invalidate query + toast
   - Edit: navigate to /books/edit/{id}

3. src/pages/admin/AdminDashboardPage.jsx:
   - Only accessible if user.role === 'ROLE_ADMIN' (ProtectedRoute with requireAdmin)
   - Stats cards: Total Users, Total Books, Active Requests, Books Borrowed
   - (Stats fetched from actuator or dedicated endpoints — add stub API calls)
   - Quick actions: View All Users, View All Books

4. src/pages/admin/AdminUsersPage.jsx:
   - Table of all users with columns: Name, Email, City, Role, Status (Active/Banned), Joined Date
   - Ban/Unban toggle button per row
   - Search users by name/email
   - Pagination
   - Call userApi.banUser(id) / userApi.unbanUser(id)
   - useMutation with optimistic updates

5. src/pages/profile/ProfilePage.jsx:
   - Show logged in user's info
   - Edit form with UpdateProfileRequest fields
   - Location update with map picker
   - Display rating (stars) and review count
   - List of recent reviews received
```

---

---

# ════════════════════════════════════════════
# PHASE 9 — DOCKERIZATION AND DEPLOYMENT
# ════════════════════════════════════════════

---

## PROMPT 9.1 — Dockerfiles for All Services
> **Where to use:** Each service's root folder individually

```
Create a production-ready multi-stage Dockerfile for each of the following Spring Boot microservices in the ReBook project.

Services: auth-service, book-service, request-service, chat-service, notification-service, rag-service, api-gateway, eureka-server

For each service generate an identical Dockerfile pattern:

Stage 1 — Build (named "build"):
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B   # Cache dependencies layer
COPY src ./src
RUN mvn clean package -DskipTests -B

Stage 2 — Runtime:
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring   # Non-root user
COPY --from=build /app/target/*.jar app.jar
USER spring:spring
EXPOSE [service-port]
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:[port]/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

Ports:
eureka-server: 8761
api-gateway: 8080
auth-service: 8081
book-service: 8082
request-service: 8083
chat-service: 8084
notification-service: 8085
rag-service: 8086

Also create frontend-react/Dockerfile:
Stage 1: node:20-alpine — npm install + npm run build
Stage 2: nginx:alpine — copy dist/ to /usr/share/nginx/html, expose 80
Include nginx.conf that handles React Router (try_files $uri $uri/ /index.html)
```

---

## PROMPT 9.2 — Full Docker Compose with All Services
> **Where to use:** Root `rebook-system/` folder
> **Open file context:** docker-compose.yml (from Prompt 0.1)

```
Update the docker-compose.yml for the ReBook project to include all Spring Boot microservices alongside the infrastructure services.

Add these Spring Boot service blocks (uncomment the stubs from earlier):

Each service follows this pattern:
  [service-name]:
    build:
      context: ./[service-name]
      dockerfile: Dockerfile
    container_name: rebook-[service-name]
    ports:
      - "[host-port]:[container-port]"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/[schema]_db
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:29092
      SPRING_DATA_REDIS_HOST: redis
      EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE: http://eureka-server:8761/eureka/
      APP_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      mysql:
        condition: service_healthy
      kafka:
        condition: service_started
      eureka-server:
        condition: service_started
    networks:
      - rebook-network
    restart: unless-stopped

Special environment variables:
- book-service: add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, APP_AWS_BUCKET_NAME, APP_AWS_REGION
- notification-service: add MAIL_USERNAME, MAIL_PASSWORD
- rag-service: add OPENAI_API_KEY

Create a .env.example file in root with all environment variables:
JWT_SECRET=your-256-bit-secret-here
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
APP_AWS_BUCKET_NAME=rebook-images
APP_AWS_REGION=ap-south-1
MAIL_USERNAME=
MAIL_PASSWORD=
OPENAI_API_KEY=

Services startup order:
1. mysql, redis, zookeeper
2. kafka (after zookeeper)
3. eureka-server (after mysql)
4. api-gateway, auth-service, book-service, request-service, chat-service, notification-service, rag-service (after eureka)
5. frontend-react (after api-gateway)

Also generate a Makefile with helpful commands:
make up       → docker-compose up -d
make down     → docker-compose down
make logs     → docker-compose logs -f
make rebuild  → docker-compose up -d --build
make clean    → docker-compose down -v (removes volumes)
```

---

## PROMPT 9.3 — GitHub Actions CI/CD Pipeline
> **Where to use:** `.github/workflows/` folder in root of `rebook-system/`

```
Create a GitHub Actions CI/CD pipeline for the ReBook microservices project.

Create .github/workflows/deploy.yml:

Trigger: push to main branch

Jobs:

Job 1 — build-and-test:
- runs-on: ubuntu-latest
- steps:
  * Checkout code
  * Setup Java 17 (temurin)
  * Cache Maven dependencies
  * Build and test each service:
    for each of: auth-service, book-service, request-service, chat-service, notification-service, rag-service, api-gateway
    run: cd [service] && mvn clean test -B
  * Build React frontend:
    cd frontend-react && npm ci && npm run build

Job 2 — build-and-push-docker (depends on job 1):
- runs-on: ubuntu-latest
- steps:
  * Checkout
  * Login to Docker Hub: uses docker/login-action with secrets DOCKER_USERNAME, DOCKER_PASSWORD
  * For each service: build and push Docker image tagged as:
    {DOCKER_USERNAME}/rebook-{service-name}:latest
    {DOCKER_USERNAME}/rebook-{service-name}:{github.sha}
  * Use docker/build-push-action for each service
  * Parallel builds using matrix strategy where possible

Job 3 — deploy-to-ec2 (depends on job 2):
- runs-on: ubuntu-latest
- steps:
  * SSH into EC2 using appleboy/ssh-action
  * SSH secrets: EC2_HOST, EC2_USERNAME, EC2_SSH_KEY (private key)
  * Remote commands:
    - cd ~/rebook-system
    - git pull origin main
    - docker-compose pull (pull latest images)
    - docker-compose up -d --remove-orphans
    - docker system prune -f (clean up old images)
    - echo "Deployment complete"

Secrets to configure in GitHub (list them in comments):
DOCKER_USERNAME, DOCKER_PASSWORD
EC2_HOST, EC2_USERNAME, EC2_SSH_KEY
JWT_SECRET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
APP_AWS_BUCKET_NAME, APP_AWS_REGION
MAIL_USERNAME, MAIL_PASSWORD
OPENAI_API_KEY

Also create .github/workflows/pr-check.yml:
- Trigger: pull_request to main or develop
- Run: build + test only (no deployment)
- Add status checks that must pass before merge
```

---

## PROMPT 9.4 — AWS EC2 Setup Script
> **Where to use:** Create as `scripts/setup-ec2.sh` in root

```
Create a bash setup script for configuring a fresh AWS EC2 t2.micro Ubuntu 22.04 instance for the ReBook project.

File: scripts/setup-ec2.sh

The script should:

1. System updates:
   sudo apt update && sudo apt upgrade -y

2. Install Docker:
   - Add Docker's official GPG key
   - Add Docker repository
   - sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin
   - sudo usermod -aG docker $USER (add current user to docker group)
   - sudo systemctl enable docker && sudo systemctl start docker

3. Install Docker Compose (standalone):
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

4. Install Git and Java (for any local builds):
   sudo apt install git openjdk-17-jdk -y

5. Configure swap space (important for t2.micro with only 1GB RAM):
   Create 2GB swap file:
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

6. Clone project:
   git clone https://github.com/{YOUR_USERNAME}/rebook-system.git ~/rebook-system
   cd ~/rebook-system

7. Create .env file with placeholders:
   cat > .env << 'EOF'
   JWT_SECRET=CHANGE_ME
   AWS_ACCESS_KEY_ID=CHANGE_ME
   AWS_SECRET_ACCESS_KEY=CHANGE_ME
   APP_AWS_BUCKET_NAME=CHANGE_ME
   APP_AWS_REGION=ap-south-1
   MAIL_USERNAME=CHANGE_ME
   MAIL_PASSWORD=CHANGE_ME
   OPENAI_API_KEY=CHANGE_ME
   EOF

8. Print completion message with next steps:
   echo "Setup complete! Edit ~/rebook-system/.env then run: docker-compose up -d"

Add comments explaining:
- EC2 security group must open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (Gateway)
- Never open database port 3306 to public
- Use EC2 IAM role for AWS S3 access instead of access keys (more secure)
```

---

---

# ════════════════════════════════════════════
# BONUS PROMPTS — ADVANCED FEATURES
# ════════════════════════════════════════════

---

## PROMPT B.1 — Redis Caching Strategy (Book Service)
> **Where to use:** After completing Book Service (Phase 3)
> **Open file context:** BookService.java, application.yml

```
Enhance the ReBook Book Service with a comprehensive Redis caching strategy.

1. RedisConfig.java in com.rebook.book.config:
   - @Configuration @EnableCaching
   - RedisCacheManager bean with:
     * Default TTL: 10 minutes
     * Per-cache TTLs:
       "books:search" → 5 minutes (search results change often)
       "books:popular" → 30 minutes (recalculated less often)
       "books:byId" → 15 minutes
     * Jackson2JsonRedisSerializer for value serialization
     * StringRedisSerializer for keys
   - RedisTemplate<String, Object> bean with same serializers

2. Update BookService.java with caching annotations:
   - @Cacheable(value="books:byId", key="#bookId") on getBookById
   - @Cacheable(value="books:popular", key="'top10'") on getPopularBooks
   - @CacheEvict(value={"books:byId", "books:popular", "books:search"}, allEntries=true)
     on createBook, updateBook, deleteBook
   
3. Manual Redis operations for popularity ranking:
   - Use RedisTemplate ZSet operations for real-time popular books:
     * On every book request (REQUEST_CREATED event): ZINCRBY "books:popularity" 1 "{bookId}"
     * getPopularBooks: ZREVRANGE "books:popularity" 0 9 (top 10) → fetch book details
   - Add method: void incrementBookPopularity(Long bookId) — called from Kafka consumer

4. Add KafkaConsumerConfig.java in book-service:
   - @KafkaListener(topics = "request-events", groupId = "book-service")
   - On REQUEST_CREATED: call incrementBookPopularity(bookId)
   - On REQUEST_APPROVED: update book status to BORROWED (instead of REST call from request-service)
   - On REQUEST_RETURNED: update book status to AVAILABLE

   This refactors the design: request-service publishes events, book-service reacts — true event-driven.
```

---

## PROMPT B.2 — Swagger Global Configuration
> **Where to use:** Each service's config/ package

```
Create a reusable Swagger/OpenAPI configuration for all ReBook microservices.

For each service (auth-service, book-service, request-service, chat-service, notification-service), create or update OpenApiConfig.java:

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("[Service Name] API")
                .version("1.0.0")
                .description("ReBook Marketplace — [Service Name]")
                .contact(new Contact().name("Srujan").email("your-email@example.com")))
            .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
            .components(new Components()
                .addSecuritySchemes("Bearer Authentication",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Enter JWT token obtained from /api/auth/login")));
    }
}

Also update application.yml for each service:
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operationsSorter: method
    tagsSorter: alpha
    try-it-out-enabled: true
  show-actuator: false

Gateway routing: add routes for /api-docs and /swagger-ui for each service so all docs are accessible through the gateway at:
/auth/swagger-ui.html → auth-service swagger
/books/swagger-ui.html → book-service swagger
etc.
Generate this gateway route configuration.
```

---

## PROMPT B.3 — Actuator and Health Monitoring
> **Where to use:** Each service's config/ + application.yml

```
Configure Spring Boot Actuator health monitoring for all ReBook microservices.

For each service, update application.yml:

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,loggers
      base-path: /actuator
  endpoint:
    health:
      show-details: always
      show-components: always
  info:
    env:
      enabled: true
  health:
    kafka:
      enabled: true
    redis:
      enabled: true  (only for services that use Redis)
    db:
      enabled: true

info:
  app:
    name: "[service-name]"
    version: "1.0.0"
    description: "ReBook [Service Name]"

Create a CustomHealthIndicator.java in each service that checks:
- Database connectivity (try a simple count query)
- For book-service: AWS S3 connectivity (try listBuckets)
- For notification-service: SMTP connectivity stub

Implement AbstractHealthIndicator and override doHealthCheck(Health.Builder builder):
- If healthy: builder.up().withDetail("service", "Running")
- If unhealthy: builder.down().withDetail("error", e.getMessage())

This makes your /actuator/health endpoint show rich details that you can monitor via AWS CloudWatch.
```

---

## PROMPT B.4 — Global Exception Handling (Standardized)
> **Where to use:** Each service — create as a shared pattern

```
Create a standardized global exception handling pattern for all ReBook microservices.

For each service, create:

1. Custom exceptions in com.rebook.[service].exception:
   - ResourceNotFoundException extends RuntimeException: (String resourceName, String fieldName, Object fieldValue)
     → message: "[resourceName] not found with [fieldName]: [fieldValue]"
   - UnauthorizedAccessException extends RuntimeException
   - DuplicateResourceException extends RuntimeException
   - BusinessRuleException extends RuntimeException (for domain rule violations)

2. ErrorResponse.java (same in all services):
   - @Data @Builder
   - int status
   - String error
   - String message
   - Map<String, String> fieldErrors (for validation errors)
   - LocalDateTime timestamp
   - String path

3. GlobalExceptionHandler.java with @RestControllerAdvice:
   - @ExceptionHandler(ResourceNotFoundException.class) → 404
   - @ExceptionHandler(UnauthorizedAccessException.class) → 403
   - @ExceptionHandler(DuplicateResourceException.class) → 409
   - @ExceptionHandler(BusinessRuleException.class) → 400
   - @ExceptionHandler(MethodArgumentNotValidException.class) → 400 with fieldErrors map
   - @ExceptionHandler(HttpMessageNotReadableException.class) → 400
   - @ExceptionHandler(Exception.class) → 500 with generic message (don't expose stack trace)
   
   Each handler:
   - Logs the exception with appropriate level (error for 500, warn for 400)
   - Returns ResponseEntity<ErrorResponse> with ErrorResponse body
   - Includes request path from HttpServletRequest

This ensures all your APIs return consistent error format — interviewers check this.
```

---

## PROMPT B.5 — Postman Collection Generator
> **Where to use:** After all services are built

```
Generate a Postman collection JSON file for testing all ReBook microservices APIs.

Create: rebook-postman-collection.json

Collection structure:
ReBook API/
├── Auth/
│   ├── Register User
│   ├── Login
│   └── Refresh Token
├── Users/
│   ├── Get My Profile
│   ├── Update Profile
│   ├── Ban User (Admin)
│   └── Get All Users (Admin)
├── Books/
│   ├── Create Book (multipart)
│   ├── Get Book by ID
│   ├── Search Books
│   ├── Get My Books
│   ├── Get Popular Books
│   ├── Update Book
│   └── Delete Book
├── Requests/
│   ├── Create Request
│   ├── Get Sent Requests
│   ├── Get Received Requests
│   ├── Approve Request
│   ├── Reject Request
│   ├── Cancel Request
│   └── Update Return Status
├── Reviews/
│   ├── Create Review
│   └── Get Reviews for User
├── Messages/
│   ├── Send Message
│   ├── Get Messages (by requestId)
│   └── Get Inbox
├── Notifications/
│   ├── Get Notifications
│   └── Mark All as Read
└── AI/
    ├── Ask About Book
    └── Get Book AI Status

Collection variables:
- baseUrl: http://localhost:8080
- accessToken: (auto-set by Login test script)
- userId: (auto-set by Login test script)

Add to Login request Tests script:
pm.test("Login successful", function() {
    pm.response.to.have.status(200);
    var json = pm.response.json();
    pm.collectionVariables.set("accessToken", json.accessToken);
    pm.collectionVariables.set("userId", json.user.id);
});

Add Authorization to collection level: Bearer {{accessToken}}

For each request include:
- Sample request body
- Pre-request scripts where needed
- Test assertions for status code
```

---

*End of ReBook Copilot Prompts*

---

> **Quick Reference — Service Ports**
> | Service | Port |
> |---------|------|
> | Eureka Server | 8761 |
> | API Gateway | 8080 |
> | Auth Service | 8081 |
> | Book Service | 8082 |
> | Request Service | 8083 |
> | Chat Service | 8084 |
> | Notification Service | 8085 |
> | RAG Service | 8086 |
> | MySQL | 3306 |
> | Redis | 6379 |
> | Kafka | 9092 |
> | Kafka UI | 8090 |

> **Build Order (always follow this sequence):**
> 1. Infrastructure (Docker Compose — MySQL, Redis, Kafka)
> 2. Eureka Server
> 3. API Gateway
> 4. Auth Service (test register + login fully before moving on)
> 5. Book Service
> 6. Request Service
> 7. Notification Service
> 8. Chat Service
> 9. RAG Service
> 10. React Frontend
> 11. Dockerize + Deploy
