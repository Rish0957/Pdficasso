# 🐳 02 - Docker & Containerization

Now that the application works locally (`start_prod.bat`), we need a way to ensure it runs *exactly the same way* on any machine, CI server, or Cloud provider. 

**Docker** solves the "it works on my machine" problem by packaging the application and its environment (OS, Node.js version, dependencies) into a standalone **Container**.

---

## 📄 The Dockerfile
A `Dockerfile` is a script that tells Docker how to build an Image. We used a **Multi-Stage Build** strategy for both the frontend and backend. 

### Why Multi-Stage?
If we just copied our code and ran `npm install`, our Docker image would contain compilers, typescript source files, and massive `node_modules` folders we don't need in production. 
A Multi-Stage build uses a "Builder" container to compile the code, and then it copies *only the resulting output* into a clean, tiny "Production" container.

### Backend Details (`backend/Dockerfile`)
1. **Stage 1 (`builder`)**: Uses `node:18-alpine`. Copies `package.json`, installs ALL dependencies, copies the TypeScript `src`, and runs `tsc` to compile to a `dist/` folder.
2. **Stage 2 (Production)**: Starts fresh. Installs *only* production dependencies (`npm ci --only=production`), copies the `dist/` folder from Stage 1, and runs `node dist/index.js`. 

### Frontend Details (`frontend/Dockerfile`)
1. **Stage 1 (`builder`)**: Uses Node to run `vite build`, which compiles the React code into optimized, static HTML/JS/CSS files in a `dist/` folder.
2. **Stage 2 (Production)**: We don't need Node.js to serve static files! We use **NGINX**, an incredibly fast, lightweight web server. We just copy the `dist/` folder into Nginx's HTML directory and expose port `80`.

---

## 🐙 Docker Compose
Running multiple containers manually via terminal commands is tedious. `docker-compose.yml` is an orchestration file that allows us to define and run multiple Docker applications at once.

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend      # Tells Docker where the Backend Dockerfile lives
    ports:
      - "3001:3001"           # Maps Port 3001 on your PC to Port 3001 inside the container

  frontend:
    build:
      context: ./frontend     # Tells Docker where the Frontend Dockerfile lives
    ports:
      - "5173:80"             # Maps Port 5173 on your PC to Port 80 (NGINX) inside the container
    depends_on:
      - backend               # Ensures the backend boots up before the frontend starts
```

With this file, a single command—`docker compose up`—will build both images, map all the ports, and spin up the entire application stack!
