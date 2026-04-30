# EC2 Kubernetes Access via NodePort

## Overview

After deploying with `scripts/deploy-minikube-from-dockerhub.sh`, your services are exposed via Kubernetes NodePort:

- **API Gateway**: `http://EC2_PUBLIC_IP:30080`
- **Frontend**: `http://EC2_PUBLIC_IP:30001`

## Step 1: Get Your EC2 Public IP

From AWS Console:
1. Go to EC2 > Instances
2. Select your instance
3. Copy the **Public IPv4 address** (e.g., `54.123.45.67`)

## Step 2: Update AWS Security Group

Allow inbound traffic on NodePort ports (30080, 30001):

**From AWS Console:**
1. EC2 > Security Groups
2. Select the security group attached to your EC2 instance
3. Click **Edit inbound rules**
4. Add two rules:

| Type | Protocol | Port Range | Source |
|------|----------|-----------|--------|
| Custom TCP | TCP | 30080 | 0.0.0.0/0 (or your IP for security) |
| Custom TCP | TCP | 30001 | 0.0.0.0/0 (or your IP for security) |

5. Save rules

**Or via AWS CLI:**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 30080 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 30001 \
  --cidr 0.0.0.0/0
```

## Step 3: Access Services

From your local machine or any external client:

```bash
# Test API Gateway health
curl http://54.123.45.67:30080/actuator/health

# Access Frontend
open http://54.123.45.67:30001
# or on Windows:
start http://54.123.45.67:30001
```

## How NodePort Works

Minikube on EC2 creates:
- **Minikube VM** (Docker container) running Kubernetes
- **Minikube publishes** ports 30080/30001 to EC2 host network
- **EC2 Security Group** controls external access to those ports
- **Your laptop** connects via EC2 public IP:NodePort

## Troubleshooting

### NodePort shows `<pending>` or not accessible

1. Check pods are running:
   ```bash
   ssh ubuntu@EC2_PUBLIC_IP
   kubectl -n rebook get pods
   ```

2. Check NodePort service:
   ```bash
   kubectl -n rebook get svc api-gateway-nodeport
   ```
   Should show:
   ```
   NAME                    TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)
   api-gateway-nodeport    NodePort   10.96.xxx.xxx   <none>        8080:30080/TCP
   ```

3. Verify port is listening on EC2:
   ```bash
   sudo netstat -tlnp | grep 30080
   # or
   sudo ss -tlnp | grep 30080
   ```

### Connection refused

- Verify security group rules are added
- Verify EC2 instance is running
- Test from EC2 locally first:
  ```bash
  ssh ubuntu@EC2_PUBLIC_IP
  curl http://localhost:30080/actuator/health
  ```

## Accessing Jenkins UI

Jenkins typically runs on port 8080 inside the EC2 instance. To expose it:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@EC2_PUBLIC_IP

# Port-forward Jenkins locally
# From your local machine:
ssh -i your-key.pem -L 8888:localhost:8080 ubuntu@EC2_PUBLIC_IP
```

Then access Jenkins at: `http://localhost:8888`

Or add another NodePort service for Jenkins (port 30008):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: jenkins-nodeport
  namespace: default  # Jenkins runs outside rebook namespace
spec:
  type: NodePort
  selector:
    app: jenkins
  ports:
    - port: 8080
      targetPort: 8080
      nodePort: 30008
```

Then access at: `http://EC2_PUBLIC_IP:30008`

## Summary

| What | Port | Access |
|------|------|--------|
| API Gateway | 30080 | `http://EC2_PUBLIC_IP:30080` |
| Frontend | 30001 | `http://EC2_PUBLIC_IP:30001` |
| Eureka | 30761 | Not exposed (internal only) |
| MySQL | 3306 | Not exposed (internal only) |
