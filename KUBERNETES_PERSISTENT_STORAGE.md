# Kubernetes Persistent Storage Setup for ReBook

## ⚠️ Problem
When pods are restarted, all data is lost. This is because containers are **ephemeral** (temporary) - when they stop, their filesystem is deleted.

## ✅ Solution
Use **Kubernetes PersistentVolumes (PV)** and **PersistentVolumeClaims (PVC)** to store data on the host system or a stable storage backend.

---

## 📋 Current Status: MySQL Storage

Your `k8s/mysql-pvc.yaml` already exists:
```yaml
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard
```

Your `k8s/mysql-deployment.yaml` mounts this PVC at `/var/lib/mysql`:
```yaml
volumeMounts:
  - name: mysql-data
    mountPath: /var/lib/mysql
volumes:
  - name: mysql-data
    persistentVolumeClaim:
      claimName: mysql-pvc
```

---

## 🔧 Step 1: Verify PVC Status on Minikube

### 1.1 Check if PVC is BOUND
```bash
# SSH into EC2 instance
ssh -i jenkins-k8s-learning.pem ubuntu@13.127.98.138

# Check PVC status
kubectl get pvc -n rebook

# Expected output:
# NAME        STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# mysql-pvc   Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   5Gi        RWO            standard       16h
```

**If STATUS is "Pending":**
- The PVC cannot be bound because Minikube's storage class isn't working
- Solution: Go to **Step 2**

### 1.2 Check Pod's Volume Mount
```bash
# Get MySQL pod name
kubectl get pods -n rebook | grep mysql

# Describe the pod (look for Volumes section)
kubectl describe pod mysql-XXXXX -n rebook

# Check if volume is mounted:
kubectl exec -it mysql-XXXXX -n rebook -- df -h | grep mysql
```

---

## 🔧 Step 2: Fix Minikube Storage (If PVC is Pending)

### 2.1 Verify Minikube StorageClass
```bash
# List available storage classes
kubectl get storageclass

# Expected: 
# NAME                 PROVISIONER                AGE
# standard (default)   k8s.io/minikube-hostpath   16h
```

If `standard` doesn't exist, create it:

```bash
cat > /tmp/minikube-storage-class.yaml << 'EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: k8s.io/minikube-hostpath
volumeBindingMode: Immediate
EOF

kubectl apply -f /tmp/minikube-storage-class.yaml
```

### 2.2 Force Minikube Storage Reinitialization
```bash
# Delete and recreate the PVC
kubectl delete pvc mysql-pvc -n rebook
kubectl apply -f k8s/mysql-pvc.yaml

# Wait 10 seconds, then check status
sleep 10
kubectl get pvc -n rebook
```

### 2.3 Verify Data Directory on Host (EC2)
Minikube stores volume data inside the Minikube container:
```bash
# List Minikube volumes
minikube ssh -- ls -la /data/

# Verify MySQL directory exists
minikube ssh -- ls -la /data/pv*/ 2>/dev/null || echo "No PV directories found yet"
```

---

## 🔧 Step 3: Verify MySQL Data Persistence

### 3.1 Create Test Data
```bash
# Connect to MySQL
kubectl exec -it -n rebook mysql-XXXXX -- mysql -u root -p$MYSQL_ROOT_PASSWORD

# Run inside MySQL:
USE auth_db;
CREATE TABLE test_persistence (id INT, data VARCHAR(100));
INSERT INTO test_persistence VALUES (1, 'This data should persist after restart');
SELECT * FROM test_persistence;
EXIT;
```

### 3.2 Restart the Pod
```bash
# Delete the MySQL pod (it will be recreated)
kubectl delete pod mysql-XXXXX -n rebook

# Wait for new pod to start
kubectl wait --for=condition=ready pod -l app=mysql -n rebook --timeout=60s

# Check data still exists
kubectl exec -it -n rebook mysql-XXXXX -- mysql -u root -p$MYSQL_ROOT_PASSWORD -e "USE auth_db; SELECT * FROM test_persistence;"
```

**Expected result:** Data persists! If not, go to **Troubleshooting**.

---

## 📊 Step 4: Add Persistent Storage for Other Services (Optional)

### 4.1 Create PVC for Redis (Cache)
```bash
cat > k8s/redis-pvc.yaml << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: rebook
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
  storageClassName: standard
EOF

kubectl apply -f k8s/redis-pvc.yaml
```

Then update `k8s/deployments.yaml` to mount it (see example below).

### 4.2 Create PVC for Kafka (Message Queue)
```bash
cat > k8s/kafka-pvc.yaml << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kafka-pvc
  namespace: rebook
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard
EOF

kubectl apply -f k8s/kafka-pvc.yaml
```

---

## 🔍 Troubleshooting Data Loss

### Issue 1: PVC Status = "Pending"
```bash
# Check events for why it's pending
kubectl describe pvc mysql-pvc -n rebook

# Look for:
# - "no persistent volumes available"
# - "waiting for first consumer to be created"

# Solution: 
minikube delete && minikube start --driver=docker
# Then re-apply all k8s manifests
```

### Issue 2: PVC Bound but Data Lost
```bash
# Check if volume mount is correct
kubectl exec -it mysql-XXXXX -n rebook -- mount | grep mysql

# Check actual data directory
kubectl exec -it mysql-XXXXX -n rebook -- ls -la /var/lib/mysql/

# If empty: Volume is fresh (not persistent)
# Solution: Ensure volumeMounts match the volume name exactly
```

### Issue 3: Pod Crashes Even With Data
```bash
# Check pod logs for errors
kubectl logs mysql-XXXXX -n rebook --tail=50

# Common issues:
# - "permission denied" → PVC permissions
# - "already in use" → Multiple pods using same PVC
# - "connection refused" → Port binding issue

# Solution: Restart the deployment
kubectl rollout restart deployment mysql -n rebook
```

### Issue 4: Minikube Storage Full
```bash
# Check Minikube disk usage
minikube ssh -- df -h /

# If full, increase Minikube size:
minikube delete
minikube start --driver=docker --memory=4096 --cpus=4 --disk-size=50g
```

---

## 📝 Example: Deploying Service with Persistent Storage

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rebook
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data  # Redis data directory
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-pvc  # References the PVC
```

---

## ✅ Checklist

- [ ] Minikube is running: `minikube status`
- [ ] StorageClass exists: `kubectl get storageclass`
- [ ] MySQL PVC is BOUND: `kubectl get pvc -n rebook`
- [ ] MySQL pod has volume mounted: `kubectl exec mysql-XXXXX -n rebook -- mount | grep mysql`
- [ ] Test data persists after pod restart
- [ ] Other services have PVC if needed (Redis, Kafka, etc.)

---

## 🚀 Next Steps

1. **Run the verification commands above** from the EC2 instance
2. **Report the output** if PVC status is still "Pending"
3. **Create PVCs for Redis/Kafka** if you want to persist cache/event data
4. **Update the deploy script** if needed to apply these changes automatically

---

## 📚 Reference

- [Kubernetes Volumes Documentation](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes PersistentVolumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Minikube Local Storage](https://minikube.sigs.k8s.io/docs/handbook/persistent_volumes/)
