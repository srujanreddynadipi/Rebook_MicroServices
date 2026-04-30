This branch (`jenkins-k8s-learning`) contains a minimal Jenkins + Kubernetes (Minikube) CI/CD setup.

Quickstart (local Minikube):

1. Install Minikube and enable ingress:

```bash
minikube start --driver=docker
minikube addons enable ingress
```

2. Configure Docker to use Minikube's daemon (optional for faster local image usage):

```bash
eval $(minikube docker-env)
# on PowerShell use: & minikube -p minikube docker-env --shell powershell | Invoke-Expression
```

3. Build & push images to Docker Hub (or use Minikube docker-env to avoid pushing):

```bash
# Replace DOCKER_USERNAME and optionally tag
docker login
mvn -f auth-service/pom.xml -DskipTests package
docker build -t YOUR_DOCKERHUB_USERNAME/rebook-auth-service:latest auth-service
docker push YOUR_DOCKERHUB_USERNAME/rebook-auth-service:latest
# Repeat for other services
```

4. Apply Kubernetes manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mysql-pvc.yaml
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

5. Edit the `k8s/deployments.yaml` image fields to use your Docker Hub username (or use images built directly into Minikube's Docker).

Jenkins notes:
- The included `Jenkinsfile` is a starter pipeline that builds JARs, builds Docker images, pushes to Docker Hub, and applies K8s manifests to the Minikube cluster.
- Configure Jenkins credentials: `docker-hub-creds` (username/password) and `kubeconfig` (if Jenkins needs kubeconfig).

RAG removal:
- `rag-service` and `docker-compose.rag.yml` have been removed in this branch only. Main and dev branches are unchanged.

If you want, I can:
- Add complete deployments for all services (auth/book/chat/request/notification/eureka)
- Provision a Helm chart instead of raw manifests
- Configure Jenkins inside Minikube as a pod
