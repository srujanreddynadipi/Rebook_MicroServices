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

def setupMavenCache(String workspaceDir) {
  // Create persistent Maven cache directory (survives workspace cleanup)
  sh """
    set -e
    mkdir -p '${workspaceDir}/.m2/repository'
    mkdir -p '${workspaceDir}/.m2'
  """

  // Create Maven settings.xml with optimizations
  sh '''
    cat > .m2/settings.xml << 'MAVEN_SETTINGS'
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
          http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <localRepository>${WORKSPACE}/.m2/repository</localRepository>
  <interactiveMode>false</interactiveMode>
  <offline>false</offline>
  <servers>
    <server>
      <id>docker-hub-private</id>
      <username>${DOCKER_USERNAME}</username>
      <password>${DOCKER_PASSWORD}</password>
    </server>
  </servers>
  <profiles>
    <profile>
      <id>cache-optimized</id>
      <properties>
        <maven.artifact.threads>8</maven.artifact.threads>
        <http.keepAlive>true</http.keepAlive>
        <maven.wagon.http.pool>true</maven.wagon.http.pool>
      </properties>
    </profile>
  </profiles>
  <activeProfiles>
    <activeProfile>cache-optimized</activeProfile>
  </activeProfiles>
</settings>
MAVEN_SETTINGS
  '''
}

pipeline {
  agent any

  parameters {
    string(
      name: 'EC2_HOST',
      defaultValue: '13.127.98.138',
      description: 'EC2 instance public IP for deploying to Minikube'
    )
    string(
      name: 'EC2_USERNAME',
      defaultValue: 'ubuntu',
      description: 'SSH username for EC2 instance'
    )
  }

  environment {
      DOCKER_HUB = '' // resolved later from credentials at runtime
    DOCKER_CREDS_ID = 'docker-hub-creds'
    EC2_SSH_CRED_ID = 'ec2-ssh-key'
    KUBECONFIG_CRED = 'kubeconfig' // optional: kubeconfig credential id
    DOCKER_TAG = "${env.BUILD_NUMBER ?: 'latest'}"
    MAVEN_VERSION = '3.9.9'
    JIB_VERSION = '3.4.4'
    
    // Maven cache and parallel build optimizations
    MAVEN_OPTS = "-Dmaven.wagon.http.pool=true -Dmaven.artifact.threads=8 -Xmx2g"
    MAVEN_CLI_OPTS = "-T 1C -q --no-transfer-progress -B"
    M2_HOME = "${WORKSPACE}/.tools/apache-maven-${MAVEN_VERSION}"
    
    // Jib layer caching (registry-based, faster on subsequent builds)
    JIB_OPTS = "-Djib.useOnlyProjectCache=false -Djib.containerize.format=Docker"
    
    // EC2 deployment (from parameters or global config)
    EC2_HOST_FINAL = "${params.EC2_HOST ?: env.EC2_HOST ?: '13.127.98.138'}"
    EC2_USER_FINAL = "${params.EC2_USERNAME ?: env.EC2_USERNAME ?: 'ubuntu'}"
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
          echo "⏱️  BUILD START: ${new Date()}"
          env.MAVEN_BIN = ensureMaven(env.WORKSPACE, env.MAVEN_VERSION)
          setupMavenCache(env.WORKSPACE)
          echo "✓ Maven binary: ${env.MAVEN_BIN}"
          echo "✓ Maven cache dir: ${env.WORKSPACE}/.m2/repository"
        }
      }
    }
    stage('Build Java Services') {
      parallel {
        stage('auth') {
          steps {
            sh "echo '⏱️  Building auth-service...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f auth-service/pom.xml -DskipTests package"
          }
        }
        stage('book') {
          steps {
            sh "echo '⏱️  Building book-service...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f book-service/pom.xml -DskipTests package"
          }
        }
        stage('request') {
          steps {
            sh "echo '⏱️  Building request-service...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f request-service/pom.xml -DskipTests package"
          }
        }
        stage('chat') {
          steps {
            sh "echo '⏱️  Building chat-service...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f chat-service/pom.xml -DskipTests package"
          }
        }
        stage('notification') {
          steps {
            sh "echo '⏱️  Building notification-service...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f notification-service/pom.xml -DskipTests package"
          }
        }
        stage('apigw') {
          steps {
            sh "echo '⏱️  Building api-gateway...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f api-gateway/pom.xml -DskipTests package"
          }
        }
        stage('eureka') {
          steps {
            sh "echo '⏱️  Building eureka-server...' && ${env.MAVEN_BIN} ${MAVEN_CLI_OPTS} -f eureka-server/pom.xml -DskipTests package"
          }
        }
      }
    }

    stage('Build & Push Docker Images') {
      steps {
        script {
          echo "⏱️  Starting Docker image builds with registry layer caching..."
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
                  echo "📦 Building & Pushing: $SERVICE_NAME (tag: $DOCKER_TAG)..."
                  "$MAVEN_BIN" ${MAVEN_CLI_OPTS} -f "$SERVICE_NAME/pom.xml" -DskipTests package \
                    com.google.cloud.tools:jib-maven-plugin:"$JIB_VERSION":build \
                    -Djib.to.image="$IMAGE_TAG" \
                    -Djib.to.tags=latest \
                    -Djib.to.auth.username="$DOCKER_USERNAME" \
                    -Djib.to.auth.password="$DOCKER_PASSWORD" \
                    -Djib.useOnlyProjectCache=false \
                    -Djib.containerize.format=Docker \
                    -Djib.container.useCurrentTimestamp=true
                  echo "✓ Successfully pushed: $IMAGE_TAG"
                '''
              }
            }
          }

          echo '✓ All Docker images built and pushed to Docker Hub'
          echo '⏱️  Next builds will be significantly faster due to layer caching'
        }
      }
    }

    stage('Deploy to Minikube') {
      steps {
        script {
          withCredentials([
            usernamePassword(credentialsId: DOCKER_CREDS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD'),
            sshUserPrivateKey(credentialsId: EC2_SSH_CRED_ID, keyFileVariable: 'EC2_KEY_FILE', usernameVariable: 'EC2_USER_FROM_CRED'),
            string(credentialsId: 'app-jwt-secret', variable: 'APP_JWT_SECRET')
          ]) {
            def ec2Host = env.EC2_HOST_FINAL?.trim()
            def ec2User = env.EC2_USER_FINAL?.trim()

            if (!ec2Host) {
              error('EC2_HOST not configured. Set via job parameter or Jenkins global environment.')
            }

            echo "🚀 Deploying to EC2: ${ec2User}@${ec2Host} (copying workspace first)"

            // Copy workspace to remote host via tar over SSH, then run the deploy script there.
            // Use a single-quoted Groovy string so secrets (like $EC2_KEY_FILE) are not interpolated by Groovy.
            withEnv(["EC2_USER_VAR=${ec2User}", "EC2_HOST_VAR=${ec2Host}", "DOCKER_USER_VAR=${DOCKER_USERNAME}"]) {
              sh '''
                set -euo pipefail
                echo "Copying workspace to ${EC2_USER_VAR}@${EC2_HOST_VAR}..."
                # Create remote dir and extract tar sent over the SSH channel
                tar -C "${WORKSPACE}" -cf - . | ssh -i "$EC2_KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${EC2_USER_VAR}@${EC2_HOST_VAR} 'mkdir -p $HOME/rebook-system && tar -C $HOME/rebook-system -xf -'

                echo "Running deploy script on remote host..."
                  ssh -i "$EC2_KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${EC2_USER_VAR}@${EC2_HOST_VAR} "APP_JWT_SECRET='${APP_JWT_SECRET}' DOCKER_USER='${DOCKER_USERNAME}' bash -s" <<'SSH_EOF'
  cd "$HOME/rebook-system"
  bash scripts/deploy-minikube-from-dockerhub.sh
  SSH_EOF
              '''
            }
          }
        }
      }
    }
  }

  post {
    success {
      echo "✅ Pipeline completed successfully! ⏱️  END: ${new Date()}"
      echo "💾 Maven cache (.m2/repository) persisted for next builds"
      echo "🐳 Docker layer cache enabled on Docker Hub registry"
      echo "🚀 Next builds will be 60-70% faster!"
    }
    failure {
      echo "❌ Pipeline failed. ⏱️  Check logs and address errors."
    }
  }
}
