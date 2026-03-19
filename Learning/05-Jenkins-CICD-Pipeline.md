# 05 - Jenkins CI/CD Pipeline

This guide explains how Jenkins fits into PDFicasso and why the pipeline is structured the way it is.

## 1. What the Pipeline Is Responsible For

The pipeline should answer one question:

`Can this branch be trusted enough to deploy to its target environment?`

In this project, Jenkins does two high-level things:

1. check out the repository
2. run backend tests
3. deploy the app stack to an environment chosen by branch

That is a practical CI/CD setup for a small product:

- not over-engineered
- still automated
- tied to branch discipline

## 2. Why Jenkins Is Useful for Learning

Jenkins is valuable here because it exposes the mechanics directly.

You can see:

- stages
- agents
- shell steps
- branch-based logic
- deployment commands

This makes it excellent for understanding CI/CD fundamentals before moving to more abstract platforms.

## 3. The Current Pipeline Stages

### Stage 1: Checkout

```groovy
checkout scm
```

This pulls the repository into the Jenkins workspace.

### Stage 2: Test Backend

The backend tests run inside a Docker-based Node 20 agent.

Why this matters:

- consistent Node version
- isolated test environment
- cleaner reproducibility

The stage currently runs:

```groovy
dir('backend') {
    sh 'npm ci'
    sh 'npm run test'
}
```

This is important because `npm ci` guarantees a lockfile-faithful install, which is what you want in CI.

### Stage 3: Deploy to Environment

The branch determines the deployment target.

- `origin/main` -> production-style ports
- `origin/dev` -> staging-style ports
- anything else -> dev-style ports

This is simple branch-driven delivery.

## 4. Why Only the Backend Test Runs in CI Right Now

This is a deliberate simplification, not necessarily the final ideal state.

Why backend tests first?

- backend contains the document transformation logic
- service tests are fast and deterministic
- they catch the most dangerous correctness issues

A mature next step would be adding:

- frontend build verification
- maybe frontend tests
- maybe image build verification per service

But for learning, the current pipeline is already meaningful because it gates deployment on real PDF behavior.

## 5. Why Branch-Based Deployment Logic Is Powerful

The Jenkinsfile does not just “build everything.”

It asks:

- what branch is this?
- which environment should receive it?
- which ports and project names should be used?

This is valuable because one pipeline can serve:

- feature validation
- staging verification
- production promotion

without duplicating separate pipeline files.

## 6. The Deployment Command Pattern

The deployment stage uses environment variables inline with `docker compose up -d --build`.

Example shape:

```groovy
sh 'FRONTEND_PORT=8081 BACKEND_PORT=3002 VITE_API_URL=http://localhost:3002 COMPOSE_PROJECT_NAME=pdficasso-staging docker compose up -d --build'
```

This is a strong pattern because:

- environment is explicit
- Compose remains reusable
- branch maps cleanly to target stack

## 7. CI/CD Lessons from the Current Project

### Lesson 1: tests are only useful if they gate something

Here, the backend test suite is not just informative. It decides whether deployment proceeds.

That is the point of CI.

### Lesson 2: pipeline simplicity is a strength

A small, understandable pipeline is better than a giant one nobody trusts.

### Lesson 3: branch strategy and CI/CD strategy are connected

Branch names are not just Git labels once Jenkins starts making deployment decisions from them.

## 8. Risks in the Current Pipeline

It is also important to be honest about what the pipeline does not yet protect.

### Gap 1: frontend build is not part of Jenkins yet

That means a frontend-only compile issue could still slip through unless you build locally first.

### Gap 2: no API smoke test after deployment

The pipeline deploys, but does not yet verify:

- backend health endpoint
- frontend availability
- real route behavior after container startup

### Gap 3: no artifact promotion model

Right now environments are rebuilt from source rather than promoting the exact same tested image artifact forward.

That is acceptable for learning and local infrastructure, but it is not the most rigorous production model.

## 9. Strong Next Improvements to the Pipeline

If you want to improve the Jenkins pipeline next, the most valuable upgrades would be:

1. add frontend build validation
2. add backend build validation after tests
3. add post-deploy smoke checks
4. archive test results and logs
5. tag Docker images with commit SHA

An example improved sequence could be:

1. checkout
2. backend install + test
3. frontend install + build
4. backend build
5. docker compose deploy
6. smoke test deployed endpoints

## 10. Why Docker-Based Jenkins Agents Matter

Running the backend test stage in a Docker agent gives you a consistent environment.

Benefits:

- prevents host-machine drift
- makes Node version explicit
- aligns better with containerized deployment strategy

This is especially important in JavaScript ecosystems where subtle version drift can cause confusing failures.

## 11. Practical Debugging Tips

If Jenkins behaves unexpectedly, inspect problems in layers:

### Layer 1: SCM

- did checkout actually pull the expected branch?

### Layer 2: Dependencies

- did `npm ci` succeed?
- is the lockfile valid?

### Layer 3: Test execution

- did Vitest pass?
- are test fixtures available in the workspace?

### Layer 4: Deployment

- did Compose build the right services?
- were the right ports and project names injected?

### Layer 5: Environment targeting

- did the branch logic send this build to the correct stack?

## 12. A Good Mental Model for CI/CD

For a project like PDFicasso, a good CI/CD mental model is:

- CI proves the branch is healthy
- CD places that branch into the right environment

Do not mix those concepts mentally.

Testing and deployment are related, but they are not the same thing.

## 13. Key Learning Takeaways

1. A small pipeline can still be a real pipeline.
2. Branch names become operational inputs once CI/CD uses them.
3. `npm ci` is better than `npm install` in CI.
4. Containerized build agents improve reproducibility.
5. The next maturity step is adding frontend verification and smoke tests.
