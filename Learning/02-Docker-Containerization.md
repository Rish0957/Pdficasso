# 02 - Docker and Containerization

This guide explains how PDFicasso is packaged and run in containers, and why those decisions matter.

## 1. Why Docker Matters Here

PDFicasso is a two-service app:

- frontend
- backend

Both services have their own dependencies, build steps, and runtime expectations.

Without Docker, a developer needs to align:

- Node version
- npm dependencies
- frontend build behavior
- backend runtime behavior
- environment variables

Docker gives us reproducibility:

- same Node base image
- same build steps
- same runtime commands
- same ports and startup conventions

That is especially useful in a project meant for learning CI/CD.

## 2. The Current Runtime Model

The app is orchestrated with `docker-compose.yml`.

### Backend service

- built from `./backend`
- exposed internally on `3001`
- host port is configurable with `BACKEND_PORT`

### Frontend service

- built from `./frontend`
- served by Nginx on container port `80`
- host port is configurable with `FRONTEND_PORT`
- receives `VITE_API_URL` as a build argument

The key design choice is that the frontend is a built static artifact, not a long-running Node frontend server in production.

## 3. Why the Frontend Uses Nginx

After `vite build`, the frontend becomes:

- HTML
- CSS
- JavaScript assets

At that point, Node is no longer required to serve the app.

Nginx is used because it is:

- smaller
- faster for static delivery
- operationally simpler

This is one of the most useful deployment lessons in frontend work:

`React apps need Node to build, not necessarily to run.`

## 4. Compose Variables as a Blueprint Mechanism

The Compose file is written like a template:

```yaml
container_name: ${COMPOSE_PROJECT_NAME:-pdficasso}-backend
ports:
  - "${BACKEND_PORT:-3001}:3001"
```

This is a strong pattern because the same Compose file can be used for:

- development
- staging
- production

Only the variables change.

That avoids duplicating:

- `docker-compose.dev.yml`
- `docker-compose.staging.yml`
- `docker-compose.prod.yml`

for a project this size.

## 5. Why `VITE_API_URL` Is a Build Arg

Vite injects environment values at build time, not runtime.

That means the frontend image must know which backend URL it should call while the assets are being built.

Example:

- local dev stack may use `http://localhost:3001`
- staging stack may use `http://localhost:3002`
- prod stack may use `http://localhost:3000`

This is why Compose passes:

```yaml
args:
  - VITE_API_URL=${VITE_API_URL:-http://localhost:3001}
```

This is an important concept:

`Frontend env configuration in Vite is usually baked into the build artifact.`

## 6. Why This Project Works Well with Containers

PDFicasso is particularly container-friendly because:

- uploads are in memory
- no database is required
- no file persistence is required
- no native system PDF binaries are required

Using `pdf-lib` instead of external CLI tools keeps the backend simpler to containerize.

If the app depended on:

- Ghostscript
- Poppler
- ImageMagick
- Java

the Docker images would become more complex and heavier.

## 7. Operational Lessons from This App

### Lesson 1: Output directories must be isolated

The backend now excludes `dist` in `tsconfig.json`.

Why does that matter operationally?

Because compiled output accidentally becoming input is not just a local problem. It can break:

- builds
- tests
- CI
- Docker build reproducibility

### Lesson 2: Docker and app config must agree

The backend always listens on container port `3001`.

The host port can change, but the application inside the container still expects `3001`.

That distinction is critical:

- container port is app-internal
- host port is environment-specific

### Lesson 3: Build-time env vs runtime env

The frontend and backend treat configuration differently:

- frontend: Vite build-time
- backend: runtime process env

That is a very common real-world source of confusion.

## 8. Security Implications

Containerization does not automatically make the app secure, but it helps structure boundaries.

### Benefits in this project

- isolated service runtimes
- predictable dependencies
- easier reproduction of production locally
- fewer host-machine differences

### Still important to remember

- file size limits still matter
- memory use still matters
- password-protected file behavior still matters
- exposed ports still need to be understood

## 9. Troubleshooting Patterns

### If frontend cannot reach backend

Check:

- `VITE_API_URL`
- backend host port
- frontend was rebuilt after env changes

### If Dockerized frontend looks fine locally but fails after a rebuild

Check:

- Vite build config
- Tailwind plugin config
- whether the API URL is stale in the built bundle

### If backend build fails unexpectedly

Check:

- `tsconfig.json`
- `dist` exclusion
- whether test files are excluded from runtime builds

## 10. Good Next Steps If You Want to Go Deeper

If you want to extend the Docker side of this project as a learning exercise, strong next steps would be:

1. add health checks to both services
2. add an Nginx reverse-proxy config instead of direct host-port exposure
3. add image tags that include Git SHA
4. add a dedicated production Compose override
5. publish images to a registry instead of only local builds

## 11. Key Learning Takeaways

1. Docker helps most when the app has multiple services and build steps.
2. Frontend configuration in Vite is often a build-time concern.
3. Compose variables are a clean way to support multiple environments.
4. Container-friendly application design starts with dependency choices.
5. Operational reliability often depends on small details like `dist` exclusion and port consistency.
