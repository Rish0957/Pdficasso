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

    post {
        always {
            sh 'docker image prune -f'  // Automatically clean up dangling images
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

## ⚡ Automation: Automatic Triggers

Since Jenkins is running on your **local machine** (`localhost:8080`), GitHub cannot "see" it to send a Webhook. You have two ways to automate:

### Option A: Poll SCM (The Easiest)
Jenkins will periodically "ask" GitHub if there are new changes.
1. In your Pipeline job, go to **Configure**.
2. Under **Build Triggers**, check **Poll SCM**.
3. In the **Schedule** box, enter `H/2 * * * *` (checks every 2 mins).

### Option B: Webhooks via **ngrok** (The Pro Way)
`ngrok` creates a secure "tunnel" from the public internet directly to your local computer. This allows GitHub to send **instant** notifications to your local Jenkins.

#### 1. Setup ngrok
1. Download ngrok from [ngrok.com](https://ngrok.com/download) and sign up for a free account.
2. Run this in your terminal to connect your account:
   `ngrok config add-authtoken YOUR_TOKEN_HERE`
3. Start the tunnel:
   `ngrok http 8080`

#### 2. Configure GitHub
1. Copy the **Forwarding** URL from the ngrok terminal (e.g., `https://xyz.ngrok-free.app`).
2. Go to your GitHub Repository → **Settings** → **Webhooks** → **Add webhook**.
3. **Payload URL**: `[YOUR_NGROK_URL]/github-webhook/` (The final `/` is important!)
4. **Content type**: `application/json`.
5. Click **Add webhook**.

#### 3. Configure Jenkins
1. In your Pipeline job, go to **Configure**.
2. Under **Build Triggers**, check **GitHub hook trigger for GITScm polling**.

Now, the very second you `git push`, Jenkins will jump into action! 🚀

---

## Useful Commands

| Task | Command |
|---|---|
| View logs | `docker logs pdficasso-jenkins` |
| Get admin password | `docker exec pdficasso-jenkins cat /var/jenkins_home/secrets/initialAdminPassword` |
| Verify Docker in Jenkins | `docker exec pdficasso-jenkins docker version` |
| Verify Compose in Jenkins | `docker exec pdficasso-jenkins docker compose version` |
