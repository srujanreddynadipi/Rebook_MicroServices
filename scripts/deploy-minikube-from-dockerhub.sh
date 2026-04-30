#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DOCKER_USER=srujanreddynadipi APP_JWT_SECRET='your-secret' bash scripts/deploy-minikube-from-dockerhub.sh

: "${DOCKER_USER:?Set DOCKER_USER, e.g. srujanreddynadipi}"
: "${APP_JWT_SECRET:?Set APP_JWT_SECRET}"

REPO_DIR="${REPO_DIR:-$HOME/rebook-system}"
cd "$REPO_DIR"

# Ensure latest branch content
if [ -d .git ]; then
  git fetch origin
  git checkout jenkins-k8s-learning
  git pull origin jenkins-k8s-learning
fi

# Replace image namespace in manifests
sed -i "s#srujanreddynadipi/#${DOCKER_USER}/#g" k8s/deployments.yaml

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mysql-secret.yaml
kubectl -n rebook create secret generic app-secret \
  --from-literal=APP_JWT_SECRET="$APP_JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/mysql-pvc.yaml
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/nodeport-services.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

echo "====== Deployment Complete ======"
kubectl -n rebook get pods
kubectl -n rebook get svc
kubectl -n rebook get ingress

echo ""
echo "====== NodePort Access (for external access via EC2 public IP) ======"
echo "Get your EC2 public IP from AWS console, then:"
echo "  API Gateway:  http://<EC2_PUBLIC_IP>:30080"
echo "  Frontend:     http://<EC2_PUBLIC_IP>:30001"
echo ""
echo "Ensure AWS Security Group allows inbound traffic on ports 30080 and 30001"

