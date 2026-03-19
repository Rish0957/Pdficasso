# 🌐 06 - Multi-Environment Stack Architecture

How we run **Production**, **Staging**, and **Development** in parallel on a single machine without them interfering with each other.

---

## The "Blueprint" Strategy

To scale from one environment to many, we treat our `docker-compose.yml` like a **Blueprint** (template) and use **Variables** to fill in the specific details (Ports and Names) for each environment.

### 1. The Variable Template (`docker-compose.yml`)
Instead of hardcoding port `80`, we use `${FRONTEND_PORT}`. Instead of naming the container `pdf-app`, we use `${COMPOSE_PROJECT_NAME}`.

### 2. The Isolation Layer
Docker Compose supports the `--project-name` (or `COMPOSE_PROJECT_NAME` variable). This creates a completely isolated network and container namespace for each environment.

| Environment | Branch | URL | Backend Port | Project Name |
|---|---|---|---|---|
| **Production** | `main` | `http://localhost:80` | `3000` | `pdficasso-prod` |
| **Staging** | `dev` | `http://localhost:8081` | `3002` | `pdficasso-staging` |
| **Development**| `feature/*` | `http://localhost:8082` | `3003` | `pdficasso-dev` |

---

## Data Isolation

Each environment has its own **Volumes**. When you upload a file to the Staging environment, it goes into a folder called `pdficasso-staging_uploads_data`. It is physically impossible for the Production app to see those files.

This is critical because it allows you to:
1. Test "destructive" features in Staging without touching live data.
2. Run experimental migrations in Dev.
3. Keep Production stable and clean.

---

## Troubleshooting the Stack

If you want to see what's running, use the project filter in the terminal:

```bash
# See only Staging containers
COMPOSE_PROJECT_NAME=pdficasso-staging docker compose ps

# See only Production containers
COMPOSE_PROJECT_NAME=pdficasso-prod docker compose ps

# View logs for just the DEV backend
COMPOSE_PROJECT_NAME=pdficasso-dev docker compose logs -f backend
```

---

## Summary of the Full Flow

1. **You write code** on a feature branch.
2. **You push** to GitHub.
3. **Jenkins notices** the push.
4. **Jenkins identifies the branch**:
    - If `main` → Deploy to **PROD** stack.
    - If `dev` → Deploy to **STAGING** stack.
    - If anything else → Deploy to **DEV** stack.
5. **Docker Compose builds/restarts** ONLY the containers for that specific environment.
