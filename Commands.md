//to connect to the remote sever in terminal
ssh -i jenkins-k8s-learning.pem ubuntu@13.127.98.138   


//to connect jenkins
ssh -i jenkins-k8s-learning.pem -L 8888:localhost:8080 ubuntu@13.127.98.138
http://localhost:8888


kubectl get nodes

//start mini kube
minikube start --driver=docker

// status 
minikube status

//Test nameSpace
kubectl get ns


<----------------------my sql --------------------->
Step 1 — Open MySQL Pod
Run:
kubectl exec -it -n rebook mysql-599ccb7948-gd24q -- bash

Step 2 — Login to MySQL
Run:
mysql -u root -p
password = root

Step 3 — Create Missing Databases
Run:
CREATE DATABASE auth_db;
CREATE DATABASE book_db;
CREATE DATABASE request_db;
CREATE DATABASE chat_db;
CREATE DATABASE notification_db;

Step 4 — Verify
Run:
SHOW DATABASES;

Step 6 — Restart Failed Pods
Run:
kubectl rollout restart deployment auth-service -n rebook
kubectl rollout restart deployment book-service -n rebook
kubectl rollout restart deployment request-service -n rebook
kubectl rollout restart deployment chat-service -n rebook
kubectl rollout restart deployment notification-service -n rebook









<-------------------------Mini kube---------------------------->
Useful For Your Project

Check all services:

kubectl get pods -n rebook

Check frontend logs:

kubectl logs -f frontend-6c866c8f4b-rrk9k -n rebook

Check MySQL pod:

kubectl exec -it mysql-599ccb7948-gd24q -n rebook -- bash
Run:

docker ps

Find the Minikube container (usually named minikube).

Then stop it manually:

docker stop minikube

After that, clean the cluster fully:

minikube delete

Then recreate it:

minikube start --driver=docker

Do not interrupt this command.

Wait until you see:

Done! kubectl is now configured to use "minikube"

Then verify:

kubectl get nodes

Expected:

minikube   Ready

After Minikube is healthy again, redeploy:

cd ~/rebook-system/Rebook_MicroServices
bash scripts/deploy-minikube-from-dockerhub.sh



<------- PERSISTENT STORAGE & DATA PERSISTENCE ------->

Check PVC Status (verify data will persist):
kubectl get pvc -n rebook
# Expected: mysql-pvc   Bound   pvc-xxx   5Gi   RWO

Check StorageClass:
kubectl get storageclass
# Expected: standard (provisioner: k8s.io/minikube-hostpath)

Check if MySQL volume is mounted:
MYSQL_POD=$(kubectl get pods -n rebook -l app=mysql -o jsonpath='{.items[0].metadata.name}')
kubectl exec $MYSQL_POD -n rebook -- mount | grep mysql

Verify data persists after pod restart:
# Step 1: Get MySQL pod name
kubectl get pods -n rebook | grep mysql
# Step 2: Create test data
kubectl exec -it POD_NAME -n rebook -- mysql -u root -p -e "CREATE TABLE test (id INT); INSERT INTO test VALUES (1);"
# Step 3: Delete the pod
kubectl delete pod POD_NAME -n rebook
# Step 4: Wait for new pod
kubectl wait --for=condition=ready pod -l app=mysql -n rebook --timeout=60s
# Step 5: Check data still exists
kubectl exec -it NEW_POD_NAME -n rebook -- mysql -u root -p -e "SELECT * FROM test;"

Run automated storage verification:
bash ~/rebook-system/Rebook_MicroServices/scripts/verify-persistent-storage.sh

Fix Pending PVC (if storage not working):
kubectl delete pvc mysql-pvc -n rebook
sleep 5
cd ~/rebook-system/Rebook_MicroServices && kubectl apply -f k8s/mysql-pvc.yaml
sleep 10
kubectl get pvc -n rebook