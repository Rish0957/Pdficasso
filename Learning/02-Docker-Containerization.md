# 🐳 02 - Docker & Containerization

Docker solves the "it works on my machine" problem by packaging your app + its environment (OS, Node version, dependencies) into a standalone **Container**.

---

## 📄 The Dockerfile

A `Dockerfile` is a recipe that tells Docker how to build an **Image** (a snapshot of your app). We use a **Multi-Stage Build** to keep images small.

### Why Multi-Stage?
Without it, the final image would include compilers, TypeScript source, and bloated `node_modules` we don't need in production. Multi-stage uses a temporary "builder" to compile, then copies **only the output** into a clean, tiny production image.

### Backend Dockerfile (Explained Line-by-Line)

```dockerfile
# STAGE 1: Use Node 20 to compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./          # Copy dependency lists first (Docker caches this layer)
RUN npm install                # Install ALL deps (including devDependencies like TypeScript)
COPY tsconfig.json ./
COPY src ./src
RUN npm run build              # Runs "tsc" → compiles TS to JS in dist/

# STAGE 2: Clean production image
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production   # Install ONLY runtime deps (no TypeScript, no @types/*)
COPY --from=builder /usr/src/app/dist ./dist   # Grab compiled JS from Stage 1
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile (Explained)

```dockerfile
# STAGE 1: Build the React app
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build              # "tsc -b && vite build" → outputs static HTML/JS/CSS to dist/

# STAGE 2: Serve with Nginx (no Node.js needed!)
FROM nginx:alpine
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

> **💡 Key Insight**: The frontend doesn't need Node to run! Once built, it's just static files. Nginx serves them at ~10x the speed of a Node server.

---

## 🚫 .dockerignore (Critical for Performance)

Just like `.gitignore` tells Git what to skip, `.dockerignore` tells Docker what NOT to copy into the build context.

**Without .dockerignore**: Our frontend build took **93 seconds** just to transfer ~180MB of `node_modules` to the Docker daemon — files that get immediately thrown away when `npm install` runs inside the container!

**With .dockerignore**: Transfer dropped to **under 1 second**.

```
# .dockerignore
node_modules       # Docker will run its own npm install
dist               # Docker will build its own output
npm-debug.log
.git
```

> **🔑 Rule of thumb**: If the Dockerfile generates it (via `npm install` or `npm run build`), exclude it from `.dockerignore`.

---

## 🐙 Docker Compose

Instead of running `docker build` and `docker run` manually for each service, `docker-compose.yml` orchestrates everything in one file:

```yaml
services:
  backend:
    build:
      context: ./backend         # Where to find the Dockerfile
    ports:
      - "3001:3001"              # host_port:container_port
    environment:
      - NODE_ENV=production

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:80"                # Your browser hits 5173, Nginx inside listens on 80
    depends_on:
      - backend                  # Start backend first
```

### Key Commands

| Command | What it does |
|---|---|
| `docker compose up --build` | Build images + start all containers |
| `docker compose up -d` | Start in detached mode (background) |
| `docker compose down` | Stop and remove all containers |
| `docker compose logs -f` | Watch live logs from all services |
| `docker ps` | List running containers |

---

## ⚠️ Gotchas We Hit (Real-World Lessons)

### 1. Node Version Mismatch
We initially used `node:18-alpine` but **Vite 8** and **Tailwind v4** require Node 20+. The error was:
```
You are using Node.js 18.20.8. Vite requires Node.js version 20.19+
ReferenceError: CustomEvent is not defined
```
**Fix**: Changed `FROM node:18-alpine` → `FROM node:20-alpine` in both Dockerfiles.

> **🔑 Lesson**: Always check the `engines` field in your `package.json` dependencies to know which Node version you need.

### 2. Missing Build Script
The Dockerfile ran `RUN npm run build` but our `package.json` had no `"build"` script defined.  
**Fix**: Added `"build": "tsc"` to the backend's `package.json` scripts.

> **🔑 Lesson**: Docker runs your code in a fresh environment. If something only worked because you ran `npx tsc` manually, it won't work in Docker.

### 3. Tailwind CSS Not Loading in Production
Tailwind v4 requires the `@tailwindcss/vite` plugin in `vite.config.ts`. Without it, the dev server works (hot module replacement), but the production build strips all utility classes.
**Fix**: Added `import tailwindcss from '@tailwindcss/vite'` and included it in the plugins array.

> **🔑 Lesson**: Always test `npm run build` locally before Dockerizing. Dev mode and production mode can behave differently.
