#!/usr/bin/env bash
# ==============================================================================
# ReBook System — EC2 Bootstrap Script
# Target: AWS m7i-flex.large, Ubuntu 24.04 LTS
#
# Usage:
#   chmod +x setup-ec2.sh && ./setup-ec2.sh
#
# EC2 Security Group — required inbound rules:
#   Port 22   (SSH)   — your IP only (never 0.0.0.0/0 in production)
#   Port 80   (HTTP)  — 0.0.0.0/0
#   Port 443  (HTTPS) — 0.0.0.0/0
#   Port 8080 (API Gateway) — 0.0.0.0/0
#
#   !! NEVER open port 3306 (MySQL) to the public internet !!
#      MySQL must only be reachable inside the Docker network.
#
# AWS Credentials note:
#   Prefer attaching an IAM Role to the EC2 instance for S3 access rather than
#   storing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in the .env file.
#   IAM Role credentials rotate automatically and never touch disk.
# ==============================================================================

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
section() { echo -e "\n${GREEN}══════════════════════════════════════════${NC}"; \
            echo -e "${GREEN}  $*${NC}"; \
            echo -e "${GREEN}══════════════════════════════════════════${NC}"; }

# ==============================================================================
# 1. System updates
# ==============================================================================
section "1/7  System update & upgrade"
sudo apt update && sudo apt upgrade -y
info "System packages are up to date."

# ==============================================================================
# 2. Install Docker (official repository — not the ubuntu snap)
# ==============================================================================
section "2/7  Installing Docker"

# Remove any old / conflicting packages shipped by Ubuntu
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt remove -y "$pkg" 2>/dev/null || true
done

# Add Docker's official GPG key
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker's stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
                    docker-buildx-plugin docker-compose-plugin

# Add current user to the docker group (takes effect after re-login or newgrp)
sudo usermod -aG docker "$USER"

# Enable & start Docker daemon
sudo systemctl enable docker
sudo systemctl start docker

info "Docker $(docker --version) installed."

# ==============================================================================
# 3. Verify Docker Compose plugin
# ==============================================================================
section "3/7  Verifying Docker Compose plugin"
info "Docker Compose plugin $(docker compose version) is available."

# ==============================================================================
# 4. Install Git and Java 17
#    Java is only needed if you want to build services directly on the instance.
#    For Docker-only deployments you can skip OpenJDK.
# ==============================================================================
section "4/7  Installing Git and Java 17"
sudo apt install -y git openjdk-17-jdk
info "Git $(git --version) installed."
info "Java $(java -version 2>&1 | head -1) installed."

# ==============================================================================
# 5. Configure swap space
#    For smaller memory instances, swap helps avoid OOM during first startup.
# ==============================================================================
section "5/7  Configuring 2 GB swap space"

if swapon --show | grep -q /swapfile; then
  warn "Swap file already exists — skipping creation."
else
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  # Make swap persistent across reboots
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  info "2 GB swap file created and activated."
fi

# Tune swappiness (lower value = prefer RAM, less aggressive swapping)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
info "vm.swappiness set to 10."

# ==============================================================================
# 6. Clone the ReBook project
#    Replace {YOUR_USERNAME} with your actual GitHub username before running.
# ==============================================================================
section "6/7  Cloning rebook-system repository"

REPO_URL="https://github.com/srujanreddynadipi/Rebook_MicroServices.git"
TARGET_DIR="$HOME/rebook-system"

if [ -d "$TARGET_DIR/.git" ]; then
  warn "Repository already exists at $TARGET_DIR — pulling latest changes."
  git -C "$TARGET_DIR" pull origin main
else
  git clone "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"
info "Repository ready at $TARGET_DIR."

# ==============================================================================
# 7. Create .env file with placeholder values
#
#    Security reminders:
#    • Keep .env out of version control (.gitignore already excludes it).
#    • For AWS credentials, prefer an EC2 IAM Role over static keys —
#      attach a role with s3:GetObject / s3:PutObject and leave
#      AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY blank.
#    • Rotate JWT_SECRET before going to production.
# ==============================================================================
section "7/7  Creating .env file with placeholders"

ENV_FILE="$TARGET_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  warn ".env already exists — skipping to avoid overwriting secrets."
  warn "Edit it manually: nano $ENV_FILE"
else
  cat > "$ENV_FILE" << 'EOF'
APP_JWT_SECRET=CHANGE_ME
MYSQL_ROOT_PASSWORD=root
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
APP_AWS_BUCKET_NAME=CHANGE_ME
APP_AWS_REGION=ap-south-1
MAIL_USERNAME=CHANGE_ME
MAIL_PASSWORD=CHANGE_ME
APP_OLLAMA_PRIMARY_BASE_URL=CHANGE_ME_COLAB_TUNNEL_URL
APP_OLLAMA_FALLBACK_BASE_URL=http://host.docker.internal:11434
APP_OLLAMA_ENABLE_FALLBACK=true
APP_OLLAMA_CHAT_MODEL=gemma:2b
APP_OLLAMA_EMBEDDING_MODEL=nomic-embed-text
APP_OLLAMA_REQUEST_TIMEOUT_SECONDS=180
EOF
  info ".env created at $ENV_FILE"
fi

# ==============================================================================
# Done
# ==============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup complete!                             ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Next steps:                                             ║${NC}"
echo -e "${GREEN}║  1. Log out and back in (activates docker group)         ║${NC}"
echo -e "${GREEN}║  2. Edit secrets:  nano ~/rebook-system/.env             ║${NC}"
echo -e "${GREEN}║  3. Start stack:   cd ~/rebook-system                    ║${NC}"
echo -e "${GREEN}║                    docker compose up -d                  ║${NC}"
echo -e "${GREEN}║  4. View logs:     docker compose logs -f                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
warn "Remember to replace {YOUR_USERNAME} in this script's REPO_URL before reuse."
