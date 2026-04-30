# Deployment (CI/CD + EC2)

## GitHub Actions Pipeline

Pipeline file: `.github/workflows/deploy.yml`

Trigger:

- `push` to `main`

### Stage 1: Build and test

Runner:

- `ubuntu-latest`

Steps:

1. Checkout repository.
2. Setup Java 17 (Temurin).
3. Restore Maven cache.
4. Run per-service tests:

```bash
cd auth-service && mvn clean test -B
cd book-service && mvn clean test -B
cd request-service && mvn clean test -B
cd chat-service && mvn clean test -B
cd notification-service && mvn clean test -B
cd api-gateway && mvn clean test -B
```

5. Setup Node 20.
6. Build frontend:

```bash
cd frontend && npm ci && npm run build
```

### Stage 2: Docker image build and push

Job:

- Matrix build (`build-and-push-docker`)

Services pushed:

- `auth-service`
- `book-service`
- `request-service`
- `chat-service`
- `notification-service`
- `api-gateway`
- `eureka-server`
- `frontend`

Docker tags per service:

- `${DOCKER_USERNAME}/rebook-<service>:latest`
- `${DOCKER_USERNAME}/rebook-<service>:${GITHUB_SHA}`

### Stage 3: SSH to main EC2 and deploy core stack

Job: `deploy-main-to-ec2`

Flow:

1. Preflight TCP reachability to `EC2_HOST:22`.
2. SSH using `appleboy/ssh-action`.
3. Clone repo if missing.
4. Write `.env` from GitHub secrets.
5. Cleanup old docker build cache/journal.
6. `git pull origin main`.
7. `docker compose pull`.
8. (RAG removed in this branch; no rag containers to stop on main host.)
9. Start core stack:

```bash
docker compose up -d --remove-orphans \
  mysql redis zookeeper kafka kafka-ui eureka-server \
  api-gateway auth-service book-service request-service \
  chat-service notification-service frontend tts
```

### Stage 4: RAG deployment (removed in this branch)

RAG deployment steps have been removed from this branch. See the `main` branch for original RAG deployment documentation.

## PR Validation Pipeline

Pipeline file: `.github/workflows/pr-check.yml`

Trigger:

- pull request to `main` or `develop`

Validates:

- Java build/test for all services
- Frontend production build

This should be configured as required status checks for protected branches.

## Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `DOCKER_USERNAME` | Docker Hub namespace |
| `DOCKER_PASSWORD` | Docker Hub access token/password |
| `EC2_HOST` | Main stack EC2 public host/IP |
| `EC2_USERNAME` | SSH username on main EC2 |
| `EC2_SSH_KEY` | PEM private key for main EC2 |
| `APP_JWT_SECRET` | JWT signing secret used at runtime |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `APP_AWS_BUCKET_NAME` | S3 bucket for images |
| `APP_AWS_REGION` | AWS region |
| `MAIL_USERNAME` | SMTP sender account |
| `MAIL_PASSWORD` | SMTP credential |

## EC2 Setup

Use script: `scripts/setup-ec2.sh`.

Recommended baseline:

- Instance type: `m7i-flex.large` (as documented in script)
- OS: Ubuntu 24.04 LTS
- Docker from official Docker apt repo
- Java 17 + Git installed
- 2 GB swap configured

### Security Group Ports

Main instance:

- `22/tcp` SSH (restricted IP)
- `80/tcp` frontend
- `443/tcp` TLS frontend
- `8080/tcp` API Gateway

Internal-only (do not public expose unless intentionally required):

- `3306` MySQL
- `9092` Kafka
- `6379` Redis

### Bootstrap command

```bash
chmod +x scripts/setup-ec2.sh
./scripts/setup-ec2.sh
```

## Rollback

### Option 1: Roll back to previous SHA tag

On target host:

```bash
cd ~/rebook-system
# edit docker-compose.yml images to a prior tag (or use env-substituted tags)
docker compose pull
docker compose up -d
```

### Option 2: Git rollback + redeploy

```bash
cd ~/rebook-system
git fetch --all
git checkout <known-good-commit>
docker compose pull
docker compose up -d
```

### Option 3: Re-run workflow from a previous successful commit

- In GitHub Actions, choose prior successful run and re-run jobs if artifacts/tags remain available.

## Operational Checks Post-Deploy

```bash
docker compose ps
docker compose logs -f --tail=100 api-gateway auth-service book-service request-service notification-service
curl http://localhost:8080/actuator/health
```

<!-- RAG host commands removed in this branch -->
