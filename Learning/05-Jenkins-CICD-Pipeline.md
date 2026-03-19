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
│  │  (port 8080)        │───>│  backend  (3001)      │  │
│  │                     │    │  frontend (5173)      │  │
│  │  Runs Jenkinsfile   │    └──────────────────────┘  │
│  │  Tests code         │                              │
│  │  Builds images      │    ┌──────────────────────┐  │
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
A custom Jenkins image with the Docker CLI installed inside it.

```dockerfile
FROM jenkins/jenkins:lts
USER root

# Download the static Docker CLI binary (no apt repos needed!)
RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz && \
    tar xzvf docker-24.0.7.tgz && \
    mv docker/docker /usr/local/bin/ && \
    rm -rf docker docker-24.0.7.tgz

# Give Jenkins permission to use the Docker socket
RUN groupadd -f docker && usermod -aG root jenkins && usermod -aG docker jenkins

USER jenkins
```

> **⚠️ Gotcha**: We originally tried installing Docker via `apt-get`, but the Jenkins LTS base image (Debian Trixie) was missing the `software-properties-common` package. **Fix**: Download the static binary directly — no package manager needed.

### 2. `jenkins-compose.yml`
Spins up the Jenkins server with one command.

```yaml
services:
  jenkins:
    build:
      context: .
      dockerfile: Dockerfile.jenkins
    ports:
      - "8080:8080"      # Jenkins Web UI
      - "50000:50000"    # Agent communication port
    volumes:
      - jenkins_data:/var/jenkins_home                   # Persist config across restarts
      - /var/run/docker.sock:/var/run/docker.sock        # Share Docker daemon
```

**Key volume mounts**:
- `jenkins_data` → Persists your Jenkins configuration, jobs, and plugins even if the container is deleted
- `docker.sock` → Lets Jenkins build Docker images using your PC's Docker engine

### 3. `Jenkinsfile`
The pipeline definition. Jenkins reads this file and executes each stage sequentially.

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout')       { ... }   // Pull the code
        stage('Test Backend')   { ... }   // npm ci + npm test inside a Node container
        stage('Build Containers') { ... } // docker compose build
        stage('Mock Deploy')    { ... }   // Log success message
    }
}
```

---

## Pipeline Stages Explained

| Stage | What happens | Fails if... |
|---|---|---|
| **Checkout** | Jenkins pulls your code from Git | Git repo is unreachable |
| **Test Backend** | Spins up a temporary `node:20-alpine` container, installs deps, runs `vitest` | Any unit test fails |
| **Build Containers** | Runs `docker compose build` to create the backend and frontend images | Dockerfile has errors |
| **Mock Deploy** | Logs a success message (placeholder for real deployment) | N/A |

If **any stage fails**, the entire pipeline stops and is marked as **RED** ❌ in the Jenkins UI. If all stages pass, it's **GREEN** ✅.

---

## First-Time Setup

1. Open **http://localhost:8080**
2. Paste the admin password from `docker logs pdficasso-jenkins`
3. Click **"Install suggested plugins"**
4. Create your admin user
5. Install the **"Docker Pipeline"** plugin (Manage Jenkins → Plugins → Available)
6. Create a **New Item** → **Pipeline** → Point it at your Git repo and `Jenkinsfile`

---

## Useful Commands

| Task | Command |
|---|---|
| Start Jenkins | `docker compose -f jenkins-compose.yml up -d` |
| Stop Jenkins | `docker compose -f jenkins-compose.yml down` |
| View logs | `docker logs pdficasso-jenkins` |
| Get admin password | `docker exec pdficasso-jenkins cat /var/jenkins_home/secrets/initialAdminPassword` |
| Rebuild Jenkins image | `docker compose -f jenkins-compose.yml up -d --build` |
