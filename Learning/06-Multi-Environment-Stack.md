# 06 - Multi-Environment Stack

This guide explains how PDFicasso can run multiple isolated environments on the same machine and why that pattern is useful.

## 1. The Core Problem

If you want:

- production
- staging
- development

on one machine, you immediately hit conflicts:

- same container names
- same ports
- same networks

Multi-environment setup is about solving those conflicts cleanly.

## 2. The Strategy Used Here

PDFicasso uses one Compose file plus environment variables.

Three values do most of the isolation work:

- `COMPOSE_PROJECT_NAME`
- `FRONTEND_PORT`
- `BACKEND_PORT`

And one more keeps the frontend pointing at the correct backend:

- `VITE_API_URL`

## 3. Why `COMPOSE_PROJECT_NAME` Matters So Much

This variable is easy to underestimate.

It changes the namespace Compose uses for:

- containers
- networks
- related resource grouping

That means:

- `pdficasso-prod-backend`
- `pdficasso-staging-backend`
- `pdficasso-dev-backend`

can all coexist.

Without project-name isolation, even different port mappings would not fully solve environment collisions.

## 4. Current Environment Mapping

The current Jenkinsfile uses this mental model:

| Environment | Branch Source | Frontend Port | Backend Port | Project Name |
| --- | --- | --- | --- | --- |
| Production | `main` | `80` | `3000` | `pdficasso-prod` |
| Staging | `dev` | `8081` | `3002` | `pdficasso-staging` |
| Development | feature branches | `8082` | `3003` | `pdficasso-dev` |

This gives every environment:

- unique ports
- unique container names
- a predictable access pattern

## 5. Why This Is Better Than Separate Compose Files

You could create:

- `docker-compose.dev.yml`
- `docker-compose.staging.yml`
- `docker-compose.prod.yml`

But for a project like this, that increases duplication.

Duplication creates a risk:

- one file gets updated
- another one is forgotten
- environments slowly diverge

Using one shared Compose blueprint keeps behavior aligned.

## 6. Environment Isolation in Practice

When Jenkins deploys a branch, it injects values at runtime.

That means:

- the same app definition is reused
- only the environment-specific variables change

This gives you:

- consistency
- lower maintenance
- easier debugging

## 7. Why the Frontend Needs an Environment-Specific API URL

Because the frontend is a built artifact, it must know where to call the backend before the build completes.

That is why:

- production frontend uses production backend URL
- staging frontend uses staging backend URL
- dev frontend uses dev backend URL

If you forget this, you can accidentally deploy:

- a staging frontend that still calls dev backend
- a production frontend that still calls staging backend

This is one of the most important multi-environment lessons in frontend deployment.

## 8. What “Isolated” Actually Means Here

Isolation in this project means:

- different container names
- different exposed host ports
- different frontend API targets
- separate Compose namespaces

It does not mean:

- separate physical machines
- separate databases
- separate cloud accounts

That is okay. This is still a valid and useful environment separation model for local CI/CD learning.

## 9. How to Inspect a Specific Environment

Examples:

```bash
COMPOSE_PROJECT_NAME=pdficasso-prod docker compose ps
COMPOSE_PROJECT_NAME=pdficasso-staging docker compose logs -f
COMPOSE_PROJECT_NAME=pdficasso-dev docker compose down
```

This is very useful because it lets you think of each environment as its own stack, even though they share the same machine.

## 10. Common Failure Modes

### Failure mode 1: port collision

If two environments try to use the same host port, one will fail to start.

### Failure mode 2: stale frontend API target

If `VITE_API_URL` is wrong during build, the deployed frontend may call the wrong backend.

### Failure mode 3: mistaken project name reuse

If two deployments use the same `COMPOSE_PROJECT_NAME`, they are not really isolated anymore. They will step on each other.

## 11. Why This Setup Is Good for Learning

This multi-environment model teaches several important DevOps ideas in a manageable way:

- configuration as data
- environment isolation
- branch-driven deployment
- avoiding duplicated infrastructure definitions

These lessons transfer directly to larger systems, even if the exact tools later change.

## 12. What a More Advanced Version Might Add

If the project grows, you could later add:

1. reverse-proxy routing by hostname instead of port
2. health checks and readiness checks
3. image registry promotion between environments
4. environment-specific secrets management
5. automated smoke tests after deploy

## 13. Summary Flow

The environment flow looks like this:

1. code is pushed to a branch
2. Jenkins checks the branch name
3. Jenkins chooses the target environment
4. Compose receives project name and ports
5. frontend is built with the matching backend URL
6. the isolated stack comes up under that environment name

## 14. Key Learning Takeaways

1. Environment isolation is mostly a naming and configuration problem.
2. `COMPOSE_PROJECT_NAME` is a powerful isolation primitive.
3. Frontend build-time API configuration is critical in multi-environment systems.
4. One parameterized Compose file is often better than several duplicated ones.
5. Branch-to-environment mapping is a clean way to connect Git workflow to deployment workflow.
