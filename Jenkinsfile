def ensureMaven(String workspaceDir, String mavenVersion) {
  def mavenHome = "${workspaceDir}/.tools/apache-maven-${mavenVersion}"
  def mavenBin = "${mavenHome}/bin/mvn"

  if (sh(script: "test -x '${mavenBin}'", returnStatus: true) != 0) {
    sh """
      set -e
      mkdir -p '${workspaceDir}/.tools'
      if [ ! -f '${workspaceDir}/.tools/apache-maven-${mavenVersion}-bin.tar.gz' ]; then
        if command -v curl >/dev/null 2>&1; then
          curl -fsSL https://archive.apache.org/dist/maven/maven-3/${mavenVersion}/binaries/apache-maven-${mavenVersion}-bin.tar.gz -o '${workspaceDir}/.tools/apache-maven-${mavenVersion}-bin.tar.gz'
        else
          wget -qO '${workspaceDir}/.tools/apache-maven-${mavenVersion}-bin.tar.gz' https://archive.apache.org/dist/maven/maven-3/${mavenVersion}/binaries/apache-maven-${mavenVersion}-bin.tar.gz
        fi
      fi
      rm -rf '${mavenHome}'
      tar -xzf '${workspaceDir}/.tools/apache-maven-${mavenVersion}-bin.tar.gz' -C '${workspaceDir}/.tools'
    """
  }

  return mavenBin
}

pipeline {
  agent any

  environment {
    DOCKER_HUB = "${DOCKER_USERNAME}" // must be set in Jenkins credentials/environment
    DOCKER_CREDS_ID = 'docker-hub-creds'
    EC2_SSH_CRED_ID = 'ec2-ssh-key'
    KUBECONFIG_CRED = 'kubeconfig' // optional: kubeconfig credential id
    DOCKER_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
    MAVEN_VERSION = '3.9.9'
    JIB_VERSION = '3.4.4'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Prepare Build Tooling') {
      steps {
        script {
          env.MAVEN_BIN = ensureMaven(env.WORKSPACE, env.MAVEN_VERSION)
        }
      }
    }
    stage('Build Java Services') {
      parallel {
        stage('auth') {
          steps {
            sh "${env.MAVEN_BIN} -f auth-service/pom.xml -B -DskipTests package"
          }
        }
        stage('book') {
          steps {
            sh "${env.MAVEN_BIN} -f book-service/pom.xml -B -DskipTests package"
          }
        }
        stage('request') {
          steps {
            sh "${env.MAVEN_BIN} -f request-service/pom.xml -B -DskipTests package"
          }
        }
        stage('chat') {
          steps {
            sh "${env.MAVEN_BIN} -f chat-service/pom.xml -B -DskipTests package"
          }
        }
        stage('notification') {
          steps {
            sh "${env.MAVEN_BIN} -f notification-service/pom.xml -B -DskipTests package"
          }
        }
        stage('apigw') {
          steps {
            sh "${env.MAVEN_BIN} -f api-gateway/pom.xml -B -DskipTests package"
          }
        }
        stage('eureka') {
          steps {
            sh "${env.MAVEN_BIN} -f eureka-server/pom.xml -B -DskipTests package"
          }
        }
      }
    }

    stage('Build & Push Docker Images') {
      steps {
        script {
          def services = [
            'auth-service','book-service','request-service','chat-service','notification-service','api-gateway','eureka-server'
          ]

          withCredentials([usernamePassword(credentialsId: DOCKER_CREDS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
            def dockerHub = DOCKER_USERNAME.trim()
            services.each { svc ->
              def buildTag = "${dockerHub}/rebook-${svc}:${DOCKER_TAG}"
              withEnv([
                "SERVICE_NAME=${svc}",
                "IMAGE_TAG=${buildTag}",
                "MAVEN_BIN=${env.MAVEN_BIN}",
                "JIB_VERSION=${env.JIB_VERSION}"
              ]) {
                sh '''
                  set -e
                  "$MAVEN_BIN" -f "$SERVICE_NAME/pom.xml" -B -DskipTests package \
                    com.google.cloud.tools:jib-maven-plugin:"$JIB_VERSION":build \
                    -Djib.to.image="$IMAGE_TAG" \
                    -Djib.to.tags=latest \
                    -Djib.to.auth.username="$DOCKER_USERNAME" \
                    -Djib.to.auth.password="$DOCKER_PASSWORD"
                '''
              }
            }
          }

          echo 'Skipping frontend image build in Jenkins because the agent has no Docker CLI; Kubernetes will continue using the existing frontend image.'
        }
      }
    }

    stage('Deploy to Minikube') {
      steps {
        script {
          withCredentials([
            sshUserPrivateKey(credentialsId: EC2_SSH_CRED_ID, keyFileVariable: 'EC2_KEY_FILE', usernameVariable: 'EC2_USER_FROM_CRED')
          ]) {
            def ec2Host = env.EC2_HOST?.trim()
            def ec2User = env.EC2_USERNAME?.trim() ?: EC2_USER_FROM_CRED

            if (!ec2Host) {
              error('Set EC2_HOST in Jenkins before running the deploy stage.')
            }

            sh """
              set -e
              ssh -i "$EC2_KEY_FILE" \
                -o StrictHostKeyChecking=no \
                -o UserKnownHostsFile=/dev/null \
                ${ec2User}@${ec2Host} 'bash -s' <<'EOF'
              set -euo pipefail
              export DOCKER_USER='${DOCKER_USERNAME}'
              export REPO_DIR="\$HOME/rebook-system"
              bash "\$REPO_DIR/scripts/deploy-minikube-from-dockerhub.sh"
EOF
            """
          }
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
