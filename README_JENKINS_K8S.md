This branch (`jenkins-k8s-learning`) contains a minimal Jenkins + Kubernetes (Minikube) CI/CD setup.

## Quick Access to Services

After deployment, access services via EC2 public IP using NodePort:

- **API Gateway**: `http://<EC2_PUBLIC_IP>:30080`
- **Frontend**: `http://<EC2_PUBLIC_IP>:30001`

**Important**: Update AWS Security Group to allow inbound traffic on ports 30080 and 30001. See [EC2_NODEPORT_ACCESS.md](EC2_NODEPORT_ACCESS.md) for detailed setup.

## Quickstart (local Minikube):

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
kubectl apply -f k8s/nodeport-services.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

5. Edit the `k8s/deployments.yaml` image fields to use your Docker Hub username (or use images built directly into Minikube's Docker).

## Jenkins Setup

The included `Jenkinsfile` is a starter pipeline that:
- Builds JARs for all services
- Bootstraps Maven inside the workspace if Jenkins does not have it installed
- Builds and pushes Docker images to Docker Hub using Jib, so Jenkins does not need a local Docker CLI
  - Tags: `:${BUILD_NUMBER}` and `:latest`
- Applies Kubernetes manifests to Minikube cluster

**Configure Jenkins credentials:**
- `docker-hub-creds`: Docker Hub username/password
- `ec2-ssh-key`: SSH private key for the Minikube EC2 host
- `kubeconfig`: (optional) Kubernetes config if Jenkins needs remote cluster access

**Set Jenkins environment:**
- `DOCKER_USERNAME`: Your Docker Hub namespace (e.g., `srujanreddynadipi`)
- `EC2_HOST`: Public host/IP of the EC2 instance running Minikube
- `EC2_USERNAME`: SSH user for that instance, if different from the credential default

## Deploying to EC2

See `scripts/setup-ec2-jenkins-minikube.sh` and `scripts/deploy-minikube-from-dockerhub.sh` for automated EC2 setup.

## RAG Removal

- `rag-service` and `docker-compose.rag.yml` have been removed in this branch only.
- Main and dev branches are unchanged.

## Further Customization

- Add more service deployments in `k8s/deployments.yaml`
- Provision a Helm chart instead of raw manifests
- Configure Jenkins inside Minikube as a pod
- Scale services with HPA (already included)
- Add Ingress rules for custom domains (already included)
