# 🌳 03 - Git Branching Strategy

In a real CI/CD pipeline, you never push directly to `main`. Here's the branching model we follow for PDFicasso.

---

## Branch Structure

```
main ─────────────────────────── Production-ready code
  │
  └── dev ────────────────────── Integration branch (all features merge here first)
        │
        ├── feature/split-zip ── A specific feature branch
        └── fix/node-version ─── A bugfix branch
```

| Branch | Purpose | Who pushes here? |
|---|---|---|
| `main` | Stable, production-ready code. Gets deployed. | Only via Pull Requests from `dev` |
| `dev` | Integration branch. All feature work merges here first for testing. | Via Pull Requests from feature branches |
| `feature/*` | One branch per feature (e.g., `feature/split-zip`). | The developer working on it |
| `fix/*` | Hotfix branches for bugs. | The developer fixing it |

---

## The Workflow

```
1. Create a feature branch from dev:
   git checkout dev
   git checkout -b feature/my-new-feature

2. Do your work, commit often:
   git add .
   git commit -m "feat: add page preview thumbnails"

3. Push to GitHub:
   git push origin feature/my-new-feature

4. Open a Pull Request: feature/my-new-feature → dev
   (Code review happens here)

5. After approval, merge into dev.
   (Jenkins CI runs tests on dev automatically)

6. When dev is stable, open a PR: dev → main
   (This triggers the production deployment pipeline)
```

---

## Commit Message Convention

We follow the **Conventional Commits** format so that commit history is readable and can be automated:

```
<type>: <short description>

Types:
  feat:     A new feature
  fix:      A bug fix
  docs:     Documentation changes
  build:    Build system changes (Docker, CI)
  refactor: Code restructuring (no feature change)
  test:     Adding or updating tests
```

### Examples from Our Project
```
feat: initial commit with Pdficasso backend and frontend integration
feat: enhance split with visual page selector and ZIP download
docs: add README.md and fix start_prod.bat
fix: upgrade Dockerfiles to Node 20 for Vite 8 compatibility
build: add multi-stage Dockerfiles and docker-compose
```

---

## 🔒 Safeguarding Your Branches

In a professional setting, we use **Branch Protection Rules** to physically prevent anyone (even you!) from pushing directly to `main` or `dev`. Everything MUST go through a Pull Request.

### How to set this up on GitHub:

1.  Go to your repository on GitHub → **Settings** → **Branches**.
2.  Click **Add branch protection rule**.
3.  **Branch name pattern**: `main`
4.  **Check these boxes**:
    - [x] **Require a pull request before merging** (forces the PR workflow).
    - [x] **Require status checks to pass before merging** (useful if you want Jenkins to "vote" on the PR).
5.  Click **Create**.
6.  **Repeat** for the `dev` branch.

Once this is done, if you try to run `git push origin main` from your terminal, GitHub will **REJECT** it with an error. This is a safety net that ensures your CI/CD pipeline remains the only way code gets deployed!

---

## Commands Cheat Sheet

| Task | Command |
|---|---|
| See all branches | `git branch -a` |
| Switch to dev | `git checkout dev` |
| Create a feature branch | `git checkout -b feature/name` |
| Push a new branch | `git push -u origin feature/name` |
| Delete a remote branch | `git push origin --delete branch-name` |
| Merge dev into main | Open a Pull Request on GitHub |
