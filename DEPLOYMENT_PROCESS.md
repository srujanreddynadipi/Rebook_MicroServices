# ReBook Microservices Deployment Documentation

## 1) Deployment Goal
Deploy the ReBook microservices system from source code to AWS EC2 using GitHub Actions CI/CD, Docker Hub image registry, and Docker Compose runtime.

Project repository:
- https://github.com/srujanreddynadipi/Rebook_MicroServices

Target runtime:
- AWS EC2 (Ubuntu)
- Docker + Docker Compose
- Public access through EC2 public IP

---

## 2) Final Architecture

### Application Services
- eureka-server
- api-gateway
- auth-service
- book-service
- request-service
- chat-service
- notification-service
- frontend (Nginx + React build)

### Infrastructure Services
- mysql
- redis
- zookeeper
- kafka
- kafka-ui

### Core Integration Pattern
- Service discovery via Eureka
- API ingress via api-gateway
- Internal service-to-service communication on Docker network
- Container images stored in Docker Hub

---

## 3) CI/CD Workflows Implemented

### A) deploy workflow
File: `.github/workflows/deploy.yml`

Pipeline jobs:
1. build-and-test
   - Maven build/test for backend services
   - Frontend dependency install + build
2. build-and-push-docker
   - Build Docker images
   - Push images to Docker Hub
3. deploy-to-ec2
   - SSH into EC2
   - Refresh `.env` from GitHub secrets
   - Pull latest images
   - Start/restart stack with Docker Compose

### B) PR validation workflow
File: `.github/workflows/pr-check.yml`

Purpose:
- Build/test validation on pull requests
- Prevent broken code from merging to protected branches

---

## 4) EC2 Bootstrap and Environment Setup

Script created:
- `scripts/setup-ec2.sh`

What this setup script performs:
- System package updates
- Docker + Docker Compose installation
- Java runtime setup
- Swap configuration for low-memory instance
- Repository clone/setup
- Initial deployment prerequisites

Infrastructure changes made during deployment:
- Security Group inbound rules corrected (SSH/HTTP/required ports)
- EBS volume expanded (8 GB -> 20 GB)
- Filesystem resized to use expanded volume

---

## 5) Secrets and Configuration

Sensitive values were moved to GitHub Actions Secrets and injected during deployment:
- Docker Hub credentials
- EC2 host/user/private key
- JWT secret and app-level secrets
- AWS credentials and mail credentials
- OpenAI key (if needed by service)

Runtime env handling:
- `.env` generated on EC2 during deploy job from GitHub Secrets
- No hardcoded production secrets in source files

---

## 6) Issues Faced and Fixes Applied

### Issue 1: Docker Hub push/login failures
Cause:
- Token scope/credentials mismatch

Fix:
- Regenerated Docker Hub token with correct permissions
- Updated GitHub secrets

### Issue 2: Slow/failed deploy due to image rebuild on EC2
Cause:
- `docker-compose.yml` used build-only pattern, triggering Maven builds on EC2

Fix:
- Added `image:` tags to services so EC2 pulls pre-built images from Docker Hub
- Kept deploy flow aligned to CI-built artifacts

### Issue 3: Deployment timeouts over SSH action
Cause:
- Pull/start sequence exceeded default timeout

Fix:
- Increased SSH command timeout in deploy workflow

### Issue 4: EC2 disk space exhaustion
Cause:
- Default 8 GB root volume insufficient for multiple images + MySQL/Kafka stack

Fix:
- Expanded EBS to 20 GB and resized filesystem

### Issue 5: Microservices unhealthy after startup
Cause:
- Eureka default URL configured as localhost inside containers
- In Docker, localhost points to the container itself, not Eureka container

Fix:
- Updated all affected services from:
  - `http://localhost:8761/eureka/`
- To:
  - `http://rebook-eureka-server:8761/eureka/`

Affected services fixed:
- api-gateway
- auth-service
- book-service
- request-service
- chat-service
- notification-service

---

## 7) End-to-End Flow of Work (What Was Done)

1. Created CI/CD workflows (`deploy.yml`, `pr-check.yml`).
2. Added EC2 setup automation (`scripts/setup-ec2.sh`).
3. Configured repo secrets and branch protection.
4. Validated local/service Maven builds.
5. Fixed Docker build and push pipeline issues.
6. Converted/validated service images and Docker deployment strategy.
7. Updated Compose to use registry images for faster deployment.
8. Fixed AWS networking and storage constraints.
9. Investigated unhealthy containers using `docker compose ps` and service logs.
10. Identified Eureka discovery misconfiguration and fixed service URLs.
11. Pushed configuration fixes to main to trigger redeploy.

---

## 8) Current Standard Deployment Runbook

### Step 1: Push to main
- Trigger: `git push origin main`
- Effect: GitHub Actions deploy workflow starts automatically.

### Step 2: CI build and image publish
- Build/test runs first
- Docker images are built and pushed to Docker Hub

### Step 3: EC2 deploy job executes
- Connect via SSH action
- Write `.env` from GitHub secrets
- Pull latest images
- `docker compose up -d --remove-orphans`

### Step 4: Verify service health on EC2
Commands:
- `docker compose ps`
- `docker logs rebook-api-gateway --tail 100`
- `docker logs rebook-auth-service --tail 100`

### Step 5: Verify endpoints
- Eureka dashboard: `http://<EC2_IP>:8761`
- API Gateway health: `http://<EC2_IP>:8080/actuator/health`
- Frontend (if mapped): `http://<EC2_IP>`

---

## 9) Recommended Operational Checks (Post-Deploy)

- Confirm all containers are `Up` and health checks pass
- Confirm Eureka has registered service instances
- Confirm gateway routes are loaded (non-zero routes)
- Confirm DB/Kafka dependencies are healthy before app verification
- Monitor memory/disk usage on EC2 for stability

---

## 10) Lessons Learned / Best Practices

- Always use service names (Docker DNS) instead of localhost for inter-container calls.
- Build images in CI; avoid heavy builds on small EC2 nodes.
- Keep enough root volume for stateful + streaming services.
- Treat `.env` as deployment artifact, not source-controlled config.
- Add health checks and logs early to reduce diagnosis time.

---

## 11) Quick Troubleshooting Cheatsheet 

If service is unhealthy:
1. `docker compose ps`
2. `docker logs <container-name> --tail 200`
3. Check Eureka URL, DB URL, Kafka broker URL in service config
4. Restart specific service:
   - `docker compose restart <service-name>`

If deploy fails in Actions:
1. Check failed job logs in GitHub Actions
2. Verify required secrets exist and are non-empty
3. Verify EC2 security group, SSH key, and instance reachability

If app unreachable from browser:
1. Confirm container port mappings
2. Confirm SG inbound rules for target port
3. Check service health and startup logs

---

## 12) Deployment Status Summary

Completed:
- CI/CD setup
- Docker image pipeline
- EC2 auto-deploy flow
- Major runtime/network/storage fixes
- Eureka service discovery correction

In routine operation now:
- Push code -> build -> push images -> deploy -> validate health

This document represents the full deployment lifecycle executed for ReBook microservices.
