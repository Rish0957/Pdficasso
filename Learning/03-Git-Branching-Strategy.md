# 03 - Git Branching Strategy

This guide explains how to think about branching for a project like PDFicasso, where product features, infrastructure, and learning-oriented documentation are all evolving together.

## 1. Why Branch Strategy Matters

Branch strategy is not about ceremony. It exists to reduce risk.

In this project, changes can affect:

- frontend behavior
- backend logic
- tests
- Docker builds
- CI/CD deployment behavior
- educational docs

A single direct push to `main` can unintentionally break far more than one feature.

## 2. Recommended Branch Model

For this project, a simple and effective model is:

- `main`
  Production-ready branch.

- `dev`
  Integration branch for validated work.

- `feature/*`
  New feature work.

- `fix/*`
  Bug fixes.

- `docs/*`
  Documentation-focused work when it is large enough to stand alone.

This balances clarity with simplicity.

## 3. Why `dev` Exists

The `dev` branch gives you a safe integration layer between:

- individual feature work
- production deployment

That is especially helpful when features arrive in waves:

- P0 usability work
- P1 editing work
- P2 export and size-reduction work

With `dev`, you can validate how multiple features interact before they reach `main`.

## 4. Feature Branch Examples for This Project

Good branch names are specific and outcome-oriented.

Examples:

- `feature/merge-reorder`
- `feature/page-editor`
- `feature/export-watermark-optimize`
- `fix/backend-tsconfig-dist`
- `docs/refresh-learning-guides`

Bad branch names are vague:

- `feature/update`
- `fix/stuff`
- `test-branch`

## 5. A Healthy Workflow

### Create from `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b feature/page-editor
```

### Work in small increments

Commit by meaningful unit:

- state refactor
- backend descriptor model
- editor UI
- tests
- docs

This makes review easier and rollback safer.

### Open a PR into `dev`

The PR should answer:

- what changed
- why it changed
- how it was verified
- what risks remain

### Promote `dev` to `main`

Only after:

- CI passes
- manual validation passes
- the integrated environment looks good

## 6. Commit Message Discipline

Use Conventional Commits where possible:

- `feat: add page editor with reorder and rotate`
- `fix: exclude dist from backend tsconfig inputs`
- `test: expand pdf service coverage for export helpers`
- `docs: rewrite learning guides for current architecture`
- `build: update compose variables for environment isolation`

Why this helps:

- easier history scanning
- easier release notes later
- clearer review context

## 7. Branch Protection Rules

If you use GitHub, set protection for:

- `main`
- `dev`

Recommended rules:

- require pull requests
- require status checks
- optionally require review
- disallow force pushes

This protects you from your own future self on tired days.

## 8. What Belongs in One PR vs Multiple PRs

This is one of the hardest practical judgment calls.

### Keep together when:

- frontend and backend changes are tightly coupled
- a feature is not meaningful unless both parts land
- tests depend on the full implementation

Example:

The page editor required:

- backend descriptor support
- frontend editor UI
- export route changes
- test updates

That is one coherent PR.

### Split when:

- docs can be reviewed independently
- refactors are mechanical
- infrastructure changes are unrelated to product behavior

Example:

- `fix/backend-tsconfig-dist`
- `docs/update-learning-material`

could reasonably be separate if they are not blocking feature work.

## 9. Handling Hotfixes

If production is broken:

1. branch from `main`
2. create `fix/<issue>`
3. patch the problem
4. merge back to `main`
5. back-merge the fix into `dev`

This last step is important. Otherwise the fix exists only in production and will be lost the next time `dev` merges into `main`.

## 10. How Branching Connects to Jenkins

In this project, branch names are not just Git organization. They also affect deployment behavior.

The Jenkinsfile uses branch-based deployment logic:

- `main` -> production-style deployment
- `dev` -> staging-style deployment
- anything else -> dev-style deployment

That means branch naming has real deployment consequences.

This is a major learning point:

`Your branching strategy becomes part of your delivery system once CI/CD starts making decisions from it.`

## 11. Common Mistakes to Avoid

### Mistake 1: Long-lived feature branches

If a branch stays open too long:

- merge conflicts grow
- review gets harder
- testing becomes less trustworthy

### Mistake 2: Mixing unrelated changes

If one branch contains:

- feature work
- unrelated docs changes
- Docker cleanup
- test refactors

reviewers struggle to understand the risk.

### Mistake 3: Skipping tests on “small” changes

Small build or config changes can break CI just as badly as product code.

### Mistake 4: Forgetting docs

In a learning-focused project, documentation is part of the product. Treat docs work as first-class work.

## 12. A Practical Workflow for This Repository

If you continue building PDFicasso, a good default cycle is:

1. open a branch from `dev`
2. implement one coherent capability
3. add or update tests
4. update docs if behavior changed
5. merge into `dev`
6. verify the deployed `dev` environment
7. promote `dev` to `main`

That is simple, realistic, and sustainable.

## 13. Key Learning Takeaways

1. Branch strategy is a risk-management tool.
2. `dev` is useful when features need integration before production.
3. CI/CD can make branch names operationally meaningful.
4. Small, coherent PRs are easier to review and safer to merge.
5. Docs and infrastructure changes deserve the same discipline as app code.
