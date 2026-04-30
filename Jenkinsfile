pipeline {
  agent any

  environment {
    DOCKER_HUB = "${DOCKER_USERNAME}" // must be set in Jenkins credentials/environment
    DOCKER_CREDS_ID = 'docker-hub-creds'
    KUBECONFIG_CRED = 'kubeconfig' // optional: kubeconfig credential id
    DOCKER_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Build Java Services') {
      parallel {
        stage('auth') {
          steps { sh 'mvn -f auth-service/pom.xml -B -DskipTests package' }
        }
        stage('book') {
          steps { sh 'mvn -f book-service/pom.xml -B -DskipTests package' }
        }
        stage('request') {
          steps { sh 'mvn -f request-service/pom.xml -B -DskipTests package' }
        }
        stage('chat') {
          steps { sh 'mvn -f chat-service/pom.xml -B -DskipTests package' }
        }
        stage('notification') {
          steps { sh 'mvn -f notification-service/pom.xml -B -DskipTests package' }
        }
        stage('apigw') {
          steps { sh 'mvn -f api-gateway/pom.xml -B -DskipTests package' }
        }
        stage('eureka') {
          steps { sh 'mvn -f eureka-server/pom.xml -B -DskipTests package' }
        }
      }
    }

    stage('Build & Push Docker Images') {
      steps {
        script {
          def dockerHub = (env.DOCKER_HUB?.trim()) ? env.DOCKER_HUB.trim() : 'srujanreddynadipi'
          def services = [
            'auth-service','book-service','request-service','chat-service','notification-service','api-gateway','eureka-server','frontend'
          ]

          docker.withRegistry('https://registry.hub.docker.com', DOCKER_CREDS_ID) {
            services.each { svc ->
              def buildTag = "${dockerHub}/rebook-${svc}:${DOCKER_TAG}"
              def latestTag = "${dockerHub}/rebook-${svc}:latest"
              sh "docker build -t ${buildTag} -t ${latestTag} ${svc}"
              sh "docker push ${buildTag}"
              sh "docker push ${latestTag}"
            }
          }
        }
      }
    }

    stage('Deploy to Minikube') {
      steps {
        script {
          // Assumes Jenkins has kubectl access (minikube tunnel or kubeconfig provided)
          sh 'kubectl apply -f k8s/namespace.yaml'
          sh 'kubectl apply -f k8s/mysql-secret.yaml'
          sh 'kubectl apply -f k8s/mysql-pvc.yaml'
          sh 'kubectl apply -f k8s/mysql-deployment.yaml'
          sh 'kubectl apply -f k8s/deployments.yaml'
          sh 'kubectl apply -f k8s/ingress.yaml'
          sh 'kubectl apply -f k8s/hpa.yaml'
        }
      }
    }
  }

  post {
    success {
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed.'
    }
  }
}
