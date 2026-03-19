# 🏗️ 05 - Jenkins CI/CD Pipeline

Jenkins is the industry-standard automation server. We run it locally inside Docker so we can learn how real CI/CD pipelines work without needing a cloud account.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  Your Windows PC                      │
│                                                       │
│  ┌─────────────────────┐    ┌──────────────────────┐  │
│  │  Jenkins Container  │    │  App Containers       │  │
│  │  (port 8080)        │───>│  (Dev / Stg / Prod)   │  │
│  │                     │    │  Isolated by Project  │  │
│  │  Runs Jenkinsfile   │    └──────────────────────┘  │
│  │  Tests code         │                              │
│  │  Deploys images     │    ┌──────────────────────┐  │
│  │        │            │    │  Docker Desktop       │  │
│  │        └────────────│───>│  (Docker Daemon)      │  │
│  └─────────────────────┘    └──────────────────────┘  │
│                                                       │
│  Connection: /var/run/docker.sock (shared socket)     │
└──────────────────────────────────────────────────────┘
```

The critical trick is **mounting the Docker socket**. Jenkins runs *inside* a container, but it needs to build *other* containers. By sharing `/var/run/docker.sock`, Jenkins talks directly to your PC's Docker Desktop engine.

---

## The Files We Created

### 1. `Dockerfile.jenkins`
A custom Jenkins image with the Docker CLI and **Docker Compose** installed.

```dockerfile
FROM jenkins/jenkins:lts
USER root

# Download the static Docker CLI binary (v27.3.1)
RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-27.3.1.tgz && \
    tar xzvf docker-27.3.1.tgz && \
    mv docker/docker /usr/local/bin/ && \
    rm -rf docker docker-27.3.1.tgz

# Install Docker Compose CLI Plugin (v2.24.1)
RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    curl -SL https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Give Jenkins permission to use the Docker socket
RUN groupadd -f docker && usermod -aG root jenkins && usermod -aG docker jenkins

USER jenkins
```

### 2. `Jenkinsfile`
The pipeline definition. We use **Conditional Branch Logic** to decide where to deploy.

```groovy
stage('Deploy to Environment') {
    steps {
        script {
            if (env.GIT_BRANCH == 'origin/dev') {
                // Staging Deploy
                sh 'FRONTEND_PORT=8081 BACKEND_PORT=3002 COMPOSE_PROJECT_NAME=pdficasso-staging docker compose up -d --build'
            } else if (env.GIT_BRANCH == 'origin/main') {
                // Production Deploy
                sh 'FRONTEND_PORT=80 BACKEND_PORT=3000 COMPOSE_PROJECT_NAME=pdficasso-prod docker compose up -d --build'
            } else {
                // Feature/Dev branch Deploy
                sh 'FRONTEND_PORT=8082 BACKEND_PORT=3003 COMPOSE_PROJECT_NAME=pdficasso-dev docker compose up -d --build'
            }
        }
    }
}
```

---

## ⚠️ Pipeline Gotchas We Fixed

### 1. Docker API Version Mismatch
**Error**: `Error response from daemon: client version 1.43 is too old. Minimum supported API version is 1.44`  
**Problem**: We used an old Docker CLI image (v24) inside Jenkins, but your Windows Docker engine was v27.  
**Fix**: Updated `Dockerfile.jenkins` to download the static binary for **Docker v27.3.1**.

### 2. Jenkinsfile Syntax Failure
**Error**: `Invalid agent type "docker" specified. Must be one of [any, label, none]`  
**Problem**: The "Docker Pipeline" plugin was missing.  
**Fix**: Installed the plugin via the Jenkins Plugin Manager.

### 3. TypeScript Build Failures
**Error**: `error TS2532: Object is possibly 'undefined'`  
**Problem**: The production build stage ran `tsc` which tried to compile our test files under strict mode.  
**Fix**: Added non-null assertions to tests and updated `tsconfig.json` to `exclude` test files from the build.

---

## Useful Commands

| Task | Command |
|---|---|
| View logs | `docker logs pdficasso-jenkins` |
| Get admin password | `docker exec pdficasso-jenkins cat /var/jenkins_home/secrets/initialAdminPassword` |
| Verify Docker in Jenkins | `docker exec pdficasso-jenkins docker version` |
| Verify Compose in Jenkins | `docker exec pdficasso-jenkins docker compose version` |
