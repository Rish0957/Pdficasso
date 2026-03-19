# PDFicasso

`PDFicasso` is a local-first PDF utility and lightweight editor built with React, Express, and `pdf-lib`.

It started as a merge/split project and now supports:

- merging multiple PDFs in a chosen order
- page-level editing for a single PDF
- thumbnail-style page previews
- page reordering, rotation, and deletion
- extracting selected pages as a single PDF or ZIP of single-page PDFs
- exporting the full edited PDF
- optional watermarking on exports
- PDF optimization exports
- explicit detection of password-protected PDFs

The project is also designed as a learning vehicle for Docker, CI/CD, TypeScript, testing, and multi-environment deployment.

## Product Snapshot

### Core user flows

1. `Merge Files`
   Upload multiple PDFs, reorder them, and export one merged PDF.

2. `Edit Pages`
   Upload one PDF, inspect all pages, reorder them, rotate them, delete pages, then:
   - export the edited PDF
   - extract selected pages as one PDF
   - extract selected pages as a ZIP of individual PDFs
   - optimize the original PDF

### Product principles

- `Local-first UX`: files are uploaded only to the local backend you are running.
- `In-memory processing`: the backend does not persist uploaded PDFs to disk.
- `Fast feedback`: the UI shows inline status banners instead of relying on blocking alerts.
- `Progressive power`: the product still feels simple for merge/split, but now supports richer page editing.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Axios |
| Backend | Node.js, Express 5, TypeScript, Multer |
| PDF engine | `pdf-lib` |
| Packaging | `archiver` |
| Testing | Vitest |
| DevOps | Docker, Docker Compose, Jenkins |

## Project Structure

```text
Pdficasso/
├── backend/                 # Express API + PDF services
├── frontend/                # React UI
├── Learning/                # Detailed learning guides
├── Test/                    # Real PDF fixtures used by tests
├── docker-compose.yml       # App orchestration
├── Dockerfile.jenkins       # Jenkins image with Docker tooling
├── Jenkinsfile              # CI/CD pipeline
├── jenkins-compose.yml      # Jenkins runtime stack
├── start_prod.bat           # Local startup helper
└── README.md
```

## Architecture Overview

### Frontend

The main UI lives in `frontend/src/App.tsx`.

Responsibilities:

- manage merge and page-editor state
- upload files with `FormData`
- render page previews returned by the backend
- keep page selection in sync with edited order
- trigger downloads from binary responses

### Backend

The API lives in `backend/src/index.ts`, and the PDF logic lives in `backend/src/pdfService.ts`.

Responsibilities:

- accept uploads with Multer memory storage
- inspect PDFs and detect password protection
- generate one-page preview PDFs
- rebuild PDFs from page descriptors
- split selected pages into one PDF or many PDFs
- add watermark text during export
- optimize output PDFs

### Shared editing model

The important abstraction in the backend is the `PageDescriptor`:

```ts
type PageDescriptor = {
  pageIndex: number;
  rotation?: number;
}
```

This lets the app represent:

- original source page
- current order
- applied rotation

That same model powers:

- page previews
- edited PDF export
- extracted PDF export
- ZIP export of selected pages

## API Summary

### `POST /api/pdf-info`

Accepts one PDF and returns:

- page count
- filename
- page descriptors
- per-page preview data URLs

### `POST /api/merge`

Accepts multiple PDFs and returns one merged PDF.

### `POST /api/split`

Accepts one PDF and either:

- legacy `pages` input, or
- new `pageDescriptors` input

Returns:

- one extracted PDF, or
- a ZIP of single-page PDFs

Also supports:

- `watermarkText`
- `optimize`

### `POST /api/rebuild`

Exports the full edited PDF from page descriptors.

### `POST /api/optimize`

Re-saves the original uploaded PDF with optimization enabled.

## Security and Constraints

- uploaded files are stored in RAM only
- backend upload limit is `50MB`
- frontend also enforces the same size cap for better UX
- password-protected PDFs are detected and rejected with an explicit message
- files are not persisted by the application

## Local Development

### Option 1: Dockerized start

Run the provided helper:

```bat
start_prod.bat
```

Default URLs:

- frontend: `http://localhost:8082`
- backend: `http://localhost:3001`

### Option 2: Run services manually

Backend:

```bash
cd backend
npm ci
npm run dev
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

## Build and Test

Backend:

```bash
cd backend
npm run build
npm run test
```

Frontend:

```bash
cd frontend
npm run build
```

## Docker and Environments

The Docker stack is environment-aware through Compose variables:

- `COMPOSE_PROJECT_NAME`
- `FRONTEND_PORT`
- `BACKEND_PORT`
- `VITE_API_URL`

Examples:

- `main` branch deploys production-style ports
- `dev` branch deploys staging-style ports
- feature branches deploy to development ports

See the Learning guides for the full explanation.

## Learning Guides

The `Learning/` folder is intentionally detailed. It explains not just what the project does, but why the code is structured this way.

- `01-React-Node-Architecture.md`
- `02-Docker-Containerization.md`
- `03-Git-Branching-Strategy.md`
- `04-Unit-Testing-Vitest.md`
- `05-Jenkins-CICD-Pipeline.md`
- `06-Multi-Environment-Stack.md`

## Current Capability Summary

### Implemented

- merge
- edit pages
- rotate pages
- reorder pages
- delete pages
- extract pages
- export edited PDFs
- optimize PDFs
- watermark export outputs
- backend tests for the PDF service layer

### Not yet implemented

- OCR
- digital signatures
- password unlock flow
- persistent user accounts or cloud storage
- page-image raster thumbnails via a PDF rendering engine

## License

MIT
