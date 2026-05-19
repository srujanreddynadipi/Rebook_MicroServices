#!/bin/bash
# verify-and-fix-persistent-storage.sh
# Run on EC2 instance (after SSH) to check and fix Kubernetes persistent storage

set -e

echo "════════════════════════════════════════════════════════════"
echo "Kubernetes Persistent Storage Verification & Fix"
echo "════════════════════════════════════════════════════════════"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1${NC}"
  else
    echo -e "${RED}✗ $1${NC}"
  fi
}

# Step 1: Check Minikube status
echo ""
echo "Step 1: Checking Minikube..."
minikube status
print_status "Minikube is running"

# Step 2: Check StorageClass
echo ""
echo "Step 2: Checking StorageClass..."
echo "Available StorageClasses:"
kubectl get storageclass
echo ""

# Check if 'standard' storage class exists
if kubectl get storageclass standard > /dev/null 2>&1; then
  echo -e "${GREEN}✓ StorageClass 'standard' exists${NC}"
else
  echo -e "${YELLOW}⚠ StorageClass 'standard' NOT found - Creating...${NC}"
  cat > /tmp/minikube-storage-class.yaml << 'EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: k8s.io/minikube-hostpath
volumeBindingMode: Immediate
EOF
  kubectl apply -f /tmp/minikube-storage-class.yaml
  echo -e "${GREEN}✓ Created StorageClass 'standard'${NC}"
fi

# Step 3: Check PVC status
echo ""
echo "Step 3: Checking PVC Status..."
echo "PersistentVolumeClaims in 'rebook' namespace:"
kubectl get pvc -n rebook -o wide
echo ""

PVC_STATUS=$(kubectl get pvc mysql-pvc -n rebook -o jsonpath='{.status.phase}' 2>/dev/null || echo "NOT_FOUND")

if [ "$PVC_STATUS" = "Bound" ]; then
  echo -e "${GREEN}✓ MySQL PVC is BOUND (good!)${NC}"
elif [ "$PVC_STATUS" = "Pending" ]; then
  echo -e "${RED}✗ MySQL PVC is PENDING (needs fix)${NC}"
  echo "Attempting to fix..."
  
  # Delete and recreate PVC
  echo "Deleting existing PVC..."
  kubectl delete pvc mysql-pvc -n rebook || true
  sleep 5
  
  echo "Re-applying PVC..."
  cd ~/rebook-system/Rebook_MicroServices
  kubectl apply -f k8s/mysql-pvc.yaml
  sleep 10
  
  # Check again
  NEW_STATUS=$(kubectl get pvc mysql-pvc -n rebook -o jsonpath='{.status.phase}' 2>/dev/null || echo "NOT_FOUND")
  if [ "$NEW_STATUS" = "Bound" ]; then
    echo -e "${GREEN}✓ PVC is now BOUND!${NC}"
  else
    echo -e "${RED}✗ PVC still PENDING - check: kubectl describe pvc mysql-pvc -n rebook${NC}"
  fi
else
  echo -e "${RED}✗ MySQL PVC not found${NC}"
  echo "Creating it..."
  cd ~/rebook-system/Rebook_MicroServices
  kubectl apply -f k8s/mysql-pvc.yaml
fi

# Step 4: Check MySQL pod volume mount
echo ""
echo "Step 4: Checking MySQL Pod Volume Mount..."
MYSQL_POD=$(kubectl get pods -n rebook -l app=mysql -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$MYSQL_POD" ]; then
  echo -e "${RED}✗ MySQL pod not running${NC}"
else
  echo -e "${GREEN}✓ MySQL pod found: $MYSQL_POD${NC}"
  
  echo "Checking volume mounts:"
  kubectl exec $MYSQL_POD -n rebook -- mount | grep -i mysql || echo "Mount not found"
  echo ""
  
  echo "Checking /var/lib/mysql directory:"
  kubectl exec $MYSQL_POD -n rebook -- ls -lah /var/lib/mysql/ | head -10
fi

# Step 5: Minikube disk usage
echo ""
echo "Step 5: Checking Minikube Disk Usage..."
echo "Available space in Minikube:"
minikube ssh -- df -h / || echo "Could not check disk space"

# Step 6: Check PersistentVolumes
echo ""
echo "Step 6: Checking PersistentVolumes..."
kubectl get pv
echo ""

echo "════════════════════════════════════════════════════════════"
echo "✅ Verification Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. If PVC is BOUND: Data should persist! Test with:"
echo "   kubectl exec -it $MYSQL_POD -n rebook -- mysql -uroot -proot -e 'SHOW DATABASES;'"
echo ""
echo "2. If PVC is PENDING: Run 'minikube delete && minikube start'"
echo "   Then re-apply all manifests"
echo ""
echo "3. To manually restart MySQL and test persistence:"
echo "   kubectl delete pod $MYSQL_POD -n rebook"
echo "   kubectl wait --for=condition=ready pod -l app=mysql -n rebook --timeout=60s"
echo ""
