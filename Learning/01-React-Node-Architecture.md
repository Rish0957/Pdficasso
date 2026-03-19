# 01 - React + Node Architecture

This guide explains how PDFicasso is structured today, after the project evolved from a simple merge/split utility into a page-aware PDF editor and export tool.

## 1. Big-Picture Mental Model

Think of the app as three layers:

1. `React UI`
   Collects user intent and keeps the editor state coherent.

2. `Express API`
   Accepts uploaded files, validates requests, and returns binary outputs.

3. `PDF Service Layer`
   Contains the actual logic for inspecting, rebuilding, splitting, watermarking, and optimizing PDFs.

That separation matters because each layer solves a different problem:

- React is for interaction and visual state.
- Express is for transport and request shaping.
- `pdf-lib` logic is for document transformation.

## 2. Frontend Architecture

The frontend is intentionally concentrated in a small number of files:

- `frontend/src/App.tsx`
- `frontend/src/components/FileUploader.tsx`

### Why keep the UI logic centralized?

Because the product is still relatively focused. A single top-level component can still coordinate:

- merge mode
- edit mode
- page selection
- page order
- export settings
- API calls

If this app grows further, a natural next step would be extracting:

- `PageEditor`
- `ExportOptionsPanel`
- `StatusBanner`

## 3. Frontend State Design

### Merge state

The merge flow keeps:

- `selectedFiles`
- processing state
- status banner state

This is enough because merge is linear:

`files -> ordered queue -> merged PDF`

### Editor state

The edit flow is richer. It tracks:

- uploaded source PDF
- generated page items
- current page order
- selected page IDs
- current page-range input
- output mode
- watermark text
- optimization toggle

This is a good example of product complexity increasing state complexity. As features grew, the state needed to represent not just file input, but an in-progress document model.

## 4. The PageItem Model on the Frontend

The frontend uses a `PageItem` object like:

```ts
type PageItem = {
  id: string
  pageIndex: number
  rotation: number
  previewUrl: string
}
```

This is powerful because it separates:

- `pageIndex`
  The original page from the uploaded PDF.

- `id`
  The current page instance in the UI.

- `rotation`
  The editor-applied transform.

- `previewUrl`
  The visual representation used by the page editor.

That means reordering the editor does not mutate the original source file directly. Instead, the UI builds a list of instructions, and the backend later uses those instructions to build the final output.

This is a classic pattern in product engineering:

- do not mutate the source immediately
- represent transformations as state
- apply them only when exporting

## 5. Why the Backend Generates Previews

At first glance, it may feel strange that the backend returns preview data instead of the frontend generating thumbnails itself.

There are good reasons:

1. The project already uses `pdf-lib` on the backend.
2. No extra frontend PDF rendering dependency is required.
3. The same service layer that understands pages can also produce preview-safe one-page PDFs.
4. The page editor remains consistent with the exact source document the backend will later export.

The tradeoff is that these previews are still PDF previews, not raster thumbnails. That is simpler to implement, but it is not the same as a true image thumbnail pipeline.

## 6. Backend Architecture

The backend has two main files:

- `backend/src/index.ts`
- `backend/src/pdfService.ts`

### `index.ts`

This file is the transport layer.

Responsibilities:

- configure Express
- configure Multer memory uploads
- parse request bodies
- convert raw request input into typed intent
- set HTTP headers
- send blobs and ZIPs
- map service errors to API responses

### `pdfService.ts`

This file is the business logic layer.

Responsibilities:

- inspect PDF metadata
- detect password protection
- merge PDFs
- create per-page preview PDFs
- rebuild edited PDFs from descriptors
- split descriptors into single-page outputs
- apply watermark text
- optimize saved output

This is a strong separation because it keeps route handlers thin and logic reusable.

## 7. The Most Important Abstraction: PageDescriptor

The backend uses:

```ts
type PageDescriptor = {
  pageIndex: number
  rotation?: number
}
```

This is the heart of the editor architecture.

Why?

Because every page operation can be expressed as a sequence of descriptors:

- reorder pages by reordering descriptors
- rotate pages by changing `rotation`
- delete pages by removing descriptors
- export selected pages by sending only selected descriptors

This is much cleaner than trying to create a custom backend route for each UI action.

Instead of:

- `/rotate-page`
- `/delete-page`
- `/move-page`
- `/extract-selection`

you can send one page-descriptor payload and let the backend rebuild the result.

This is a very important design lesson:

`Prefer modeling document changes as data over creating many narrowly-scoped mutation endpoints.`

## 8. Request / Response Flow by Feature

### Merge flow

1. User uploads multiple PDFs.
2. Frontend keeps them in chosen order.
3. Frontend sends `FormData` with repeated `pdfs`.
4. Backend reads all files in memory.
5. `mergePdfs()` copies pages into a new `PDFDocument`.
6. Backend returns a binary PDF response.
7. Frontend triggers a download.

### Editor load flow

1. User uploads one PDF.
2. Frontend calls `/api/pdf-info`.
3. Backend inspects the file.
4. Backend rejects encrypted PDFs early if needed.
5. Backend returns:
   - page count
   - filename
   - page descriptors
   - preview data URLs
6. Frontend builds the editor state.

### Extract flow

1. User selects pages in the current edited order.
2. Frontend builds selected page descriptors.
3. Frontend sends:
   - source PDF
   - selected descriptors
   - output mode
   - watermark text
   - optimize flag
4. Backend either:
   - builds one extracted PDF, or
   - builds many single-page PDFs and streams a ZIP

### Edited PDF export flow

1. User edits the whole page order.
2. Frontend sends all current page descriptors.
3. Backend rebuilds the full PDF in that order.
4. Optional watermark and optimization are applied.
5. The result is downloaded as `*_edited.pdf`.

## 9. Why Multer Uses Memory Storage

The backend uses Multer memory storage instead of writing uploads to disk.

Benefits:

- simpler local-first privacy story
- no temp-file cleanup logic
- fewer filesystem edge cases
- cleaner behavior inside ephemeral containers

Tradeoffs:

- file size must be constrained carefully
- many simultaneous large uploads would increase RAM usage

That is why the `50MB` limit exists in both frontend and backend.

## 10. Encryption Handling

Earlier versions of the app loaded PDFs with `ignoreEncryption: true` and tried to continue.

The newer architecture does something more intentional:

1. inspect the PDF first
2. detect whether it is encrypted
3. reject with a clear product-level message

Why is this better?

- users receive a meaningful explanation
- unsupported files fail early
- the rest of the service layer stays simpler

This is a good example of a product improvement that also improves architecture.

## 11. Architectural Strengths of the Current Build

### Strength 1: Shared transformation model

The same descriptor model powers:

- previews
- edits
- extracts
- rebuilds

That reduces drift between UI and backend.

### Strength 2: Thin routes, richer service layer

The route file mostly parses input and sets headers. The document logic is reusable and testable.

### Strength 3: Incremental product growth without a rewrite

The project started simple, but the architecture allowed:

- P0 usability features
- P1 editing features
- P2 export enhancements

without a full redesign.

## 12. Architecture Tradeoffs and Future Refactors

The current architecture is good for a learning-focused, medium-sized project, but there are obvious next steps if the product keeps growing.

### Refactor candidate 1: split `App.tsx`

The current file is doing a lot. The next clean move would be:

- `components/PageEditor.tsx`
- `components/ExportPanel.tsx`

### Refactor candidate 2: typed API helpers

Right now Axios calls live directly in the component. A future improvement would be:

- `frontend/src/api/pdfApi.ts`

This would centralize:

- endpoint URLs
- error normalization
- request/response types

### Refactor candidate 3: service submodules

`pdfService.ts` could eventually split into:

- `inspectionService.ts`
- `mergeService.ts`
- `exportService.ts`
- `previewService.ts`

That is not required yet, but it would become useful if OCR, annotations, or signatures are added.

## 13. Key Learning Takeaways

If you remember only a few things from this guide, remember these:

1. Keep transport logic and document logic separate.
2. Model edits as data, not as many tiny imperative endpoints.
3. Let unsupported file states fail early and clearly.
4. Use frontend-only persistence when the product does not need backend persistence.
5. Reuse the same internal model across preview, edit, and export flows whenever possible.
