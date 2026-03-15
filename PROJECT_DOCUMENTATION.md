# ReBook System - Production Documentation

Version: 1.0  
Last Updated: 2026-03-15  
Audience: Engineering, DevOps, QA, Security Reviewers, Project Stakeholders

---

## 1. Executive Summary

ReBook is a cloud-deployable, microservices-based book exchange platform that supports:
- User registration, login, and role-based access
- Book listing, search, and recommendation workflows
- Borrow and return request lifecycle management
- Real-time chat between users per request thread
- Event-driven notifications through in-app and email channels

The platform is containerized and designed for automated CI/CD deployment to AWS EC2 using Docker Compose and GitHub Actions.

---

## 2. System Architecture

### 2.1 Core Services

Application services:
- eureka-server
- api-gateway
- auth-service
- book-service
- request-service
- chat-service
- notification-service
- frontend

Infrastructure services:
- mysql
- redis
- zookeeper
- kafka
- kafka-ui

### 2.2 Architectural Patterns

- Microservices architecture with service discovery
- API Gateway as unified ingress
- Event-driven communication using Kafka
- Shared infrastructure over Docker bridge network
- Stateless service runtime with externalized configuration

### 2.3 Service Communication

- External client traffic enters via frontend and API Gateway
- API Gateway routes internal requests via Eureka service discovery
- Gateway performs JWT validation and propagates user context headers
- Request and notification workflows use Kafka events for async processing
- Chat supports REST and WebSocket STOMP channels

---

## 3. Repository Structure

Root-level key files and folders:
- docker-compose.yml: Full runtime orchestration
- DEPLOYMENT_PROCESS.md: Deployment history and process details
- DOCKER_SETUP.md: Local and container startup instructions
- DOCKER_EXPLAINED.md: Docker architecture explanation
- scripts/setup-ec2.sh: EC2 bootstrap automation
- .github/workflows/deploy.yml: CI/CD pipeline
- .github/workflows/pr-check.yml: Pull request validation pipeline

Service folders:
- api-gateway
- auth-service
- book-service
- request-service
- chat-service
- notification-service
- eureka-server
- frontend
- rag-service (placeholder only, not production integrated)

---

## 4. Technology Stack

Backend:
- Java 17
- Spring Boot 3.1.x
- Spring Cloud 2022.x
- Spring Security
- Spring Data JPA
- Spring WebSocket
- Spring Actuator
- JJWT
- MapStruct
- Lombok

Frontend:
- React 19
- Vite
- React Router
- TanStack React Query
- Axios
- Tailwind CSS
- STOMP JS + SockJS

Data and Messaging:
- MySQL 8
- Redis 7
- Apache Kafka + ZooKeeper

Infrastructure and Delivery:
- Docker
- Docker Compose
- GitHub Actions
- AWS EC2
- Docker Hub
- AWS S3 (book image storage)

---

## 5. Functional Capabilities

### 5.1 Authentication and Authorization

- User register, login, and refresh-token endpoints
- Access token + refresh token model
- Role-based authorization for admin-only operations
- User context propagation via headers for downstream services

### 5.2 Book Management

- Book CRUD with owner/admin constraints
- Multi-image upload and deletion to/from S3
- Search with keyword/category/city/condition/type filters
- Geolocation radius-based results
- Popular books and recommendation endpoint

### 5.3 Request Lifecycle

- Create, approve, reject, cancel, and return-status updates
- State transitions validated by role and ownership
- Borrow period and due-date logic for lending requests
- Review submission after valid completed flow

### 5.4 Real-Time Chat

- Request-threaded messaging
- WebSocket endpoint with JWT-authenticated connect flow
- Topic broadcast and user queue delivery
- Read/unread tracking and inbox previews

### 5.5 Notification Workflows

- Kafka consumer for request lifecycle events
- In-app notification persistence and unread counters
- Email notifications for major request transitions
- Scheduled return reminders for due-soon books

---

## 6. API and Routing Overview

Gateway public routes include:
- Auth register/login/refresh
- Book listing/search/detail
- Recommendations

Gateway protected routes include:
- User profile and user management
- Book create/update/delete
- Request and review operations
- Chat message APIs
- Notifications APIs

WebSocket:
- Endpoint: /ws
- App destination prefix: /app
- Broker destinations: /topic and /queue

---

## 7. Environment Configuration

### 7.1 Required Runtime Variables

Security and auth:
- APP_JWT_SECRET
- JWT_SECRET

Database:
- MYSQL_ROOT_PASSWORD

AWS integration:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- APP_AWS_BUCKET_NAME
- APP_AWS_REGION

Mail:
- MAIL_USERNAME
- MAIL_PASSWORD

Optional/extension:
- OPENAI_API_KEY

### 7.2 Configuration Principles

- Use environment variables only for secrets
- Never commit production credentials
- Use profile-based configuration for local and docker runtime
- Keep service URLs internal to Docker DNS in container environments

---

## 8. Local Development Setup

### 8.1 Prerequisites

- Docker and Docker Compose
- Java 17+
- Maven 3.9+
- Node.js 20+

### 8.2 Startup Flow

1. Prepare .env file with required values
2. Build Java services if needed
3. Start stack with Docker Compose
4. Start frontend development server if running outside container

Reference: DOCKER_SETUP.md for platform-specific steps.

### 8.3 Health Verification

Recommended checks:
- Docker container status
- Service actuator health endpoints
- Eureka dashboard registration
- Kafka and Redis health

---

## 9. CI/CD and Release Pipeline

### 9.1 Pull Request Validation

Workflow: .github/workflows/pr-check.yml

Validations:
- Build and test Java services
- Build frontend
- Prevent merge of broken branches

### 9.2 Deployment Pipeline

Workflow: .github/workflows/deploy.yml

Stages:
1. Build and test
2. Build and push Docker images to Docker Hub
3. SSH deployment to EC2
4. Pull latest images and restart stack

### 9.3 Deployment Strategy

- Artifact-first deployment via prebuilt images
- Environment file regeneration on target host from GitHub secrets
- Container restart with remove-orphans

---

## 10. Security Posture

Implemented controls:
- JWT token validation and expiry checks
- Role-based access for admin functions
- Protected routes at gateway and service levels
- Secrets externalized through environment variables

Hardening recommendations for production:
- Restrict CORS to approved origins (avoid wildcard in production)
- Enforce HTTPS termination at load balancer or reverse proxy
- Rotate JWT secrets and cloud credentials periodically
- Add rate limiting and WAF in front of public endpoints
- Enable vulnerability scanning for images and dependencies
- Introduce centralized secret management (AWS Secrets Manager or equivalent)

---

## 11. Observability and Operations

### 11.1 Built-in Monitoring

- Spring Actuator health endpoints
- Docker health checks per service
- Kafka UI for topic visibility
- Container logs via Docker runtime

### 11.2 Recommended Enhancements

- Centralized logging (ELK/OpenSearch or Loki)
- Metrics collection (Prometheus + Grafana)
- Alerting for service downtime, queue lag, and disk pressure
- Distributed tracing (OpenTelemetry)

### 11.3 SLO Suggestions

- API availability: 99.5%+
- P95 read latency: under 300 ms for non-chat APIs
- Event processing latency: under 5 seconds for notification fanout

---

## 12. Data and State Management

Primary persistence:
- MySQL for users, books, requests, messages, notifications, reviews

Cache and transient state:
- Redis for popularity and read-heavy paths

Event streams:
- request-events topic
- book-events topic

Backup recommendations:
- Daily MySQL logical backup and retention policy
- Periodic volume snapshot for disaster recovery
- Restore test at regular intervals

---

## 13. Production Runbook

### 13.1 Pre-Deployment Checklist

- All CI checks passing
- Required secrets present and valid
- Docker images published successfully
- EC2 free disk and memory within safe thresholds
- Database backups verified

### 13.2 Deployment Checklist

- Pull latest source and images
- Regenerate .env from secure source
- Restart with docker compose up -d --remove-orphans
- Confirm service health and registration
- Execute smoke tests against key flows

### 13.3 Post-Deployment Validation

Functional smoke tests:
- User login and token refresh
- Book listing and detail retrieval
- Request create and status transition
- Chat message exchange
- Notification read/unread behavior

### 13.4 Rollback Strategy

- Re-deploy last known good image tags
- Restore prior .env snapshot if configuration regression
- Restart stack and rerun smoke checks

---

## 14. Incident Response Guide

### 14.1 Common Failure Modes

- Service unhealthy due to dependency startup order
- Gateway auth failures caused by secret mismatch
- Kafka unavailability causing delayed notifications
- Disk pressure on EC2 from images and logs
- Eureka misconfiguration using localhost inside containers

### 14.2 Triage Sequence

1. Check container status
2. Inspect failing service logs
3. Validate dependency health (MySQL, Kafka, Redis, Eureka)
4. Verify environment variables and service URLs
5. Restart affected service or full stack as required

### 14.3 Escalation Criteria

Escalate immediately when:
- Authentication outage blocks all user access
- Data corruption or migration failure detected
- Persistent message-processing backlog impacts business flows

---

## 15. Testing and Quality

Current coverage includes:
- Unit tests for chat and notification modules
- Controller/service behavior tests
- JWT utility tests

Recommended quality improvements:
- Integration tests for Kafka-driven workflows
- Contract tests between gateway and downstream services
- End-to-end regression suite for critical user journeys
- Load tests for API Gateway and chat channels

---

## 16. Known Limitations

- rag-service exists as scaffold only and is not integrated
- CORS is permissive for development convenience
- No centralized log aggregation by default
- Limited automated E2E test coverage currently

---

## 17. Compliance and Governance Notes

- Ensure PII handling policy for user profile fields (city, mobile, location)
- Define retention and deletion policies for chat messages and notifications
- Enforce access reviews for admin role assignment
- Audit secret access and CI/CD permissions regularly

---

## 18. Reference Documents

- DEPLOYMENT_PROCESS.md
- DOCKER_SETUP.md
- DOCKER_EXPLAINED.md
- .github/workflows/deploy.yml
- .github/workflows/pr-check.yml

---

## 19. Maintenance Ownership Template

Suggested ownership matrix:
- Platform and CI/CD: DevOps owner
- Backend services: Java backend owner(s)
- Frontend: React owner(s)
- Security controls and audits: Security owner
- Production operations: On-call rotation

Update this section with named owners, escalation contacts, and weekly review cadence.

---

## 20. Production Readiness Status Snapshot

Current maturity:
- Architecture and modularity: Good
- Containerization and deployment automation: Good
- Security baseline: Moderate
- Observability and incident tooling: Moderate
- Test depth and E2E confidence: Moderate

Recommended next milestone:
- Add centralized monitoring and alerting
- Tighten CORS and security headers for production domains
- Increase integration and E2E test coverage
- Formalize disaster recovery drills
