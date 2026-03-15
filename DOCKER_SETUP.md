ssh -i rebook-key.pem ubuntu@13.203.12.138 // connect terminal in lap

# ReBook System - Docker Setup & Startup Guide

Complete guide to build, run, and verify all microservices and infrastructure components.

---

## 📋 Prerequisites

- **Docker** and **Docker Compose** installed
- **Java 17+** (for local builds if needed)
- **Maven 3.9+** (for local builds if needed)
- **.env file** configured with required environment variables

---

## 🔐 Environment Setup

### 1. Create/Verify `.env` File

Create a `.env` file in the project root with the following variables:

```env
APP_JWT_SECRET=cmVib29rLXNlY3JldC1rZXktMjU2LWJpdHMtbG9uZy1wbGFjZWhvbGRlcg==
MYSQL_ROOT_PASSWORD=root
```

> **Note:** Keep `.env` file secure and don't commit it to version control.

---

## 🚀 Quick Start

### Option 1: Build and Start Everything (First Time)

```bash
# Navigate to project root
cd rebook-system

# Build all services and start containers
 Option 2: Start Existing Containers

```bash
# Start services without rebuilding
docker-compose up -d
```

### Option 3: Start Specific Service

```bash
# Rebuild and start a specific service
docker-compose up -d --build auth-service

# Or just start without rebuild
docker-compose up -d auth-service
```

docker compose up -d --build --force-recreate book-service api-gateway

---

## 🪟 Windows / PowerShell Workflow (Recommended)

Maven downloads inside Docker can be unreliable on some networks. The stable approach is to **build JARs locally** and let Docker only copy them in.

### First-Time Setup

**Step 1 — Build all JARs on the host:**
```powershell
cd C:\path\to\rebook-system

mvn clean package -DskipTests -B -q -f eureka-server/pom.xml
mvn clean package -DskipTests -B -q -f api-gateway/pom.xml
mvn clean package -DskipTests -B -q -f auth-service/pom.xml
mvn clean package -DskipTests -B -q -f book-service/pom.xml
mvn clean package -DskipTests -B -q -f request-service/pom.xml
mvn clean package -DskipTests -B -q -f chat-service/pom.xml
mvn clean package -DskipTests -B -q -f notification-service/pom.xml
```

**Step 2 — Build Docker images and start all containers:**
```powershell
docker compose build
docker compose up -d
```

**Step 3 — Start the frontend dev server (separate terminal):**
```powershell
cd frontend
npm run dev
```

### Subsequent Startups (Containers Already Built)

If the containers exist and you just restarted your machine:
```powershell
docker compose up -d
# Then in a second terminal:
cd frontend && npm run dev
```

### After Changing Java Code in One Service

Only rebuild the changed service(s):
```powershell
# Example: auth-service was edited
mvn clean package -DskipTests -B -q -f auth-service/pom.xml
docker compose build auth-service
docker compose up -d auth-service
```

### Fixing Kafka Stale Cluster ID (Fresh Volume Error)

If Kafka fails to start with a cluster ID mismatch error (common after `docker compose down -v` or on first run after deleting volumes):
```powershell
docker compose down
docker volume rm rebook-system_kafka_data
docker compose up -d
```

---

## ✅ Verify All Services Are Running

### Check Container Status

```bash
# List all running containers
docker-compose ps
```

**Expected Output:**
```
NAME                   IMAGE                             COMMAND                  SERVICE         STATUS
rebook-api-gateway     rebook-system-api-gateway         "java -jar /app/app.…"   api-gateway     Up (healthy)
rebook-auth-service    rebook-system-auth-service        "java -jar /app/app.…"   auth-service    Up (healthy)
rebook-eureka-server   rebook-system-eureka-server       "java -jar /app/app.…"   eureka-server   Up (healthy)
rebook-kafka           confluentinc/cp-kafka:7.4.0       "/etc/confluent/dock…"   kafka           Up
rebook-kafka-ui        provectuslabs/kafka-ui:latest     "/bin/sh -c 'java...'"   kafka-ui        Up
rebook-mysql           mysql:8.0                         "docker-entrypoint.s…"   mysql           Up (healthy)
rebook-redis           redis:7-alpine                    "docker-entrypoint.s…"   redis           Up
rebook-zookeeper       confluentinc/cp-zookeeper:7.4.0   "/etc/confluent/dock…"   zookeeper       Up
```

---

## 🏥 Health Checks

### Check All Services Health

Run these commands to verify each service is operating correctly:

#### 1. **Eureka Server** (Service Discovery)
```bash
curl http://localhost:8761/actuator/health
```

**Expected Response:**
```json
{"status":"UP","components":{"discoveryComposite":{"status":"UP"}}}
```

#### 2. **API Gateway**
```bash
curl http://localhost:8080/actuator/health
```

**Expected Response:**
```json
{"status":"UP"}
```

#### 3. **Auth Service**
```bash
curl http://localhost:8081/actuator/health
```

**Expected Response:**
```json
{"status":"UP"}
```

#### 4. **MySQL Database**
```bash
docker exec rebook-mysql mysql -uroot -proot -e "SELECT 1"
```

**Expected Output:**
```
1
```

#### 5. **Kafka** (Message Broker)
```bash
docker exec rebook-kafka kafka-topics --bootstrap-server kafka:29092 --list
```

#### 6. **Redis** (Caching)
```bash
docker exec rebook-redis redis-cli ping
```

**Expected Response:**
```
PONG
```

#### 7. **Kafka-UI** (Web Interface)

Open in browser: `http://localhost:8090`

---

## 📊 Service Ports Reference

| Service | Port | Container Name | Purpose | Access |
|---------|------|-----------------|---------|--------|
| **API Gateway** | 8080 | rebook-api-gateway | Single browser entry point | `http://localhost:8080` |
| **Auth Service** | 8081 | rebook-auth-service | User authentication / JWT | `http://localhost:8081` |
| **Book Service** | 8082 | rebook-book-service | Book listings & search | `http://localhost:8082` |
| **Request Service** | 8083 | rebook-request-service | Borrow requests | `http://localhost:8083` |
| **Chat Service** | 8084 | rebook-chat-service | Real-time messaging | `http://localhost:8084` |
| **Notification Service** | 8085 | rebook-notification-service | Email notifications | `http://localhost:8085` |
| **Eureka Server** | 8761 | rebook-eureka-server | Service discovery | `http://localhost:8761` |
| **MySQL** | 3307 | rebook-mysql | Database | `localhost:3307` |
| **Redis** | 6379 | rebook-redis | Caching layer | `localhost:6379` |
| **Kafka** | 9092 | rebook-kafka | Message broker | `localhost:9092` |
| **Zookeeper** | 2181 | rebook-zookeeper | Kafka coordination | `localhost:2181` |
| **Kafka-UI** | 8090 | rebook-kafka-ui | Kafka monitoring | `http://localhost:8090` |
| **Frontend (dev)** | 5173 | npm run dev | React UI | `http://localhost:5173` |

> The API Gateway (`localhost:8080`) is the **only** port the frontend talks to. All API routes are proxied through it.

---

## 📝 Useful Docker Commands

### Logs & Monitoring

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service with timestamps
docker-compose logs --timestamps -f auth-service

# View last 50 lines of logs
docker-compose logs --tail=50

# View logs for multiple services
docker-compose logs -f auth-service eureka-server

# Real-time container stats
docker stats
```

### Starting & Stopping

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d auth-service

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart auth-service

# Stop all services (keep volumes)
docker-compose stop

# Stop all services and remove containers (keep volumes)
docker-compose down

# Stop all services and remove everything (including volumes)
docker-compose down -v

# Pause all services
docker-compose pause

# Resume all services
docker-compose unpause
```

### Rebuilding & Updating

```bash
# Rebuild specific service
docker-compose build auth-service

# Rebuild all services
docker-compose build

# Rebuild and start specific service
docker-compose up -d --build auth-service

# Rebuild all and start
docker-compose up -d --build

# Remove unused images/containers
docker system prune
```

### Inspecting Services

```bash
# Get container details
docker inspect rebook-auth-service

# View environment variables
docker inspect --format='{{json .Config.Env}}' rebook-auth-service | jq

# Get container IP
docker inspect --format='{{.NetworkSettings.IPAddress}}' rebook-auth-service

# View container network
docker network inspect rebook-system_rebook-network
```

### Accessing Containers

```bash
# Access container shell
docker exec -it rebook-auth-service /bin/sh

# Run command in container
docker exec rebook-mysql mysql -uroot -proot -e "SHOW DATABASES;"

# View running processes
docker top rebook-auth-service
```

---

## 🗄️ Database Operations

### MySQL

```bash
# Connect to MySQL
docker exec -it rebook-mysql mysql -uroot -proot

# List all databases
docker exec rebook-mysql mysql -uroot -proot -e "SHOW DATABASES;"

# Show tables in a database
docker exec rebook-mysql mysql -uroot -proot -e "USE auth_db; SHOW TABLES;"

# Execute SQL file
docker exec -i rebook-mysql mysql -uroot -proot < init.sql

# Backup database
docker exec rebook-mysql mysqldump -uroot -proot --all-databases > backup.sql

# Restore database
docker exec -i rebook-mysql mysql -uroot -proot < backup.sql
```

### Redis

```bash
# Access Redis CLI
docker exec -it rebook-redis redis-cli

# Check Redis info
docker exec rebook-redis redis-cli info

# Flush all keys
docker exec rebook-redis redis-cli FLUSHALL

# Monitor Redis commands
docker exec -it rebook-redis redis-cli monitor
```

### Kafka

```bash
# List all topics
docker exec rebook-kafka kafka-topics --bootstrap-server kafka:29092 --list

# Create a topic
docker exec rebook-kafka kafka-topics --bootstrap-server kafka:29092 --create --topic test-topic --partitions 1 --replication-factor 1

# Describe topic
docker exec rebook-kafka kafka-topics --bootstrap-server kafka:29092 --describe --topic test-topic

# Delete topic
docker exec rebook-kafka kafka-topics --bootstrap-server kafka:29092 --delete --topic test-topic

# Produce messages
docker exec -it rebook-kafka kafka-console-producer --broker-list kafka:29092 --topic test-topic

# Consume messages
docker exec -it rebook-kafka kafka-console-consumer --bootstrap-server kafka:29092 --topic test-topic --from-beginning
```

---

## 🧪 API Testing Examples

### Auth Service - Register User

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"SecurePass123!",
    "firstName":"John",
    "lastName":"Doe"
  }'
```

### Auth Service - Login

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"SecurePass123!"
  }'
```

### Eureka Server - View Registered Services

```bash
curl http://localhost:8761/eureka/apps
```

### API Gateway - Check Status

```bash
curl http://localhost:8080/actuator/health
```

---

## 🔧 Troubleshooting

### All Services Stopped Unexpectedly

```bash
# Check logs
docker-compose logs

# Restart all services
docker-compose down
docker-compose up -d --build
```

### Container Won't Start

```bash
# Check service logs
docker-compose logs auth-service

# Rebuild service
docker-compose build --no-cache auth-service
docker-compose up -d auth-service
```

### Port Already in Use

```bash
# Find process using port (e.g., 8080)
netstat -ano | findstr :8080  # Windows
lsof -i :8080                  # macOS/Linux

# Stop everything and restart
docker-compose down
docker-compose up -d
```

### Database Connection Issues

```bash
# Check MySQL is running
docker-compose ps mysql

# Test MySQL connection
docker exec rebook-mysql mysql -uroot -proot -e "SELECT 1"

# Check MySQL logs
docker-compose logs mysql
```

### Kafka Connection Issues

```bash
# Check Kafka is running
docker-compose ps kafka

# View Kafka logs
docker-compose logs kafka

# Use internal bootstrap server (kafka:29092) not localhost:9092
docker exec rebook-kafka kafka-topics --bootstrap-server kafka:29092 --list
```

### Kafka Stale Cluster ID Error

Symptom: Kafka container exits immediately with `InconsistentClusterIdException`. This happens when the `kafka_data` volume has an old cluster ID that no longer matches Zookeeper.

```powershell
# Stop everything, delete the stale Kafka volume, and restart
docker compose down
docker volume rm rebook-system_kafka_data
docker compose up -d
```

---

## 📦 Environment Profiles

Services support different profiles via `application-{profile}.yml`:

- **`docker`** - Used automatically when running in Docker (set via `SPRING_PROFILES_ACTIVE=docker`)
- **`local`** - For local development (default)
- **`prod`** - For production deployments

Dockerfile automatically activates the `docker` profile.

---

## 🔄 Full Lifecycle Commands

### Complete Setup from Scratch

```bash
# 1. Stop and remove everything
docker-compose down -v

# 2. Rebuild all images
docker-compose build

# 3. Start all services
docker-compose up -d

# 4. Wait for services to be healthy (check docker-compose ps)
sleep 30
docker-compose ps

# 5. Verify services
curl http://localhost:8761/actuator/health  # Eureka
curl http://localhost:8080/actuator/health  # API Gateway
curl http://localhost:8081/actuator/health  # Auth Service

echo "All services are running!"
```

### One-Line Restart

```bash
docker-compose restart
```

### One-Line Full Reset

```bash
docker-compose down -v && docker-compose up -d --build
```

---

## 📚 Documentation Links

- **Eureka Server**: `http://localhost:8761`
- **Kafka-UI**: `http://localhost:8090`
- **API Gateway Swagger** (if enabled): `http://localhost:8080/swagger-ui.html`
- **Auth Service Swagger** (if enabled): `http://localhost:8081/swagger-ui.html`

---

## ✨ Quick Reference Cheatsheet

```bash
# START
docker-compose up -d --build

# STATUS
docker-compose ps

# LOGS
docker-compose logs -f

# STOP
docker-compose down

# CLEAN RESTART
docker-compose down -v && docker-compose up -d --build

# HEALTH CHECK ALL SERVICES
curl http://localhost:8761/actuator/health && \
curl http://localhost:8080/actuator/health && \
curl http://localhost:8081/actuator/health
```

---

## 📝 Notes

- All services use the `rebook-network` bridge network for inter-service communication
- Volumes: `mysql_data`, `redis_data`, `kafka_data` - persist container data
- `.env` file should NOT be committed to version control
- Services have health checks configured with timeouts and retries
- Kafka requires Zookeeper for coordination

---

**Last Updated:** March 11, 2026

For issues or questions, check logs: `docker-compose logs -f [service-name]`
