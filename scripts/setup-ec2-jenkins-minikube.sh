#!/usr/bin/env bash
set -euo pipefail

# Ubuntu-focused setup for Jenkins + Docker + kubectl + Minikube
# Run as ubuntu user: bash scripts/setup-ec2-jenkins-minikube.sh

echo "[1/9] Add Jenkins GPG key"
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /etc/apt/keyrings/jenkins-keyring.asc >/dev/null
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list >/dev/null

echo "[2/9] System update"
sudo apt-get update -y || true
sudo apt-get upgrade -y

echo "[3/9] Install base packages"
sudo apt-get install -y curl wget git unzip ca-certificates gnupg lsb-release apt-transport-https software-properties-common conntrack

echo "[4/9] Install Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable docker
sudo systemctl restart docker

echo "[5/9] Install Java (Jenkins requirement)"
sudo apt-get install -y fontconfig openjdk-17-jre

echo "[6/9] Install Jenkins"
if ! command -v jenkins >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y jenkins
fi
sudo systemctl enable jenkins
sudo systemctl restart jenkins

echo "[7/9] Install kubectl"
if ! command -v kubectl >/dev/null 2>&1; then
  curl -fsSL https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl -o kubectl
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/kubectl
fi

echo "[8/9] Install Minikube"
if ! command -v minikube >/dev/null 2>&1; then
  curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
  chmod +x minikube
  sudo mv minikube /usr/local/bin/minikube
fi

echo "[9/9] Start Minikube with Docker driver"
minikube start --driver=docker
minikube addons enable ingress

echo "[10/10] Allow Jenkins to use Docker + kubeconfig"
sudo usermod -aG docker jenkins
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp "$HOME/.kube/config" /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube

echo "Setup complete. IMPORTANT: log out and SSH back in to refresh docker group for your user."
echo "Jenkins initial admin password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
