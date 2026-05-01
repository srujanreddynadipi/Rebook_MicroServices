//to connect to the remote sever in terminal
ssh -i jenkins-k8s-learning.pem ubuntu@13.127.98.138   


//to connect jenkins
ssh -i jenkins-k8s-learning.pem -L 8888:localhost:8080 ubuntu@13.127.98.138
http://localhost:8888


