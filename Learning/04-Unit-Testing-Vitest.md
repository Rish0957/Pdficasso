# 04 - Unit Testing with Vitest

This guide explains how the backend test strategy works in PDFicasso and why it is structured this way.

## 1. Why Testing Matters in This Project

PDFicasso manipulates binary documents. That makes testing more important than it would be in a simple CRUD app.

A bug here can show up as:

- wrong page order
- missing pages
- invalid rotation
- corrupted export output
- build regressions that only appear in CI

Because PDFs are opaque binary files, you do not want to rely only on manual “open it and see” validation.

## 2. What We Test Today

The current backend service tests cover:

- page counting
- PDF merging
- splitting into individual pages
- extracting selected pages into one PDF
- preview generation
- descriptor generation
- rebuilding PDFs from descriptors
- rotation behavior
- optimization behavior
- watermark-compatible export paths
- error paths for invalid indices and corrupt input

The tests use real fixture PDFs from `Test/`.

That is important. Real files surface real behavior.

## 3. Why Vitest Was a Good Choice

Vitest fits this stack well because:

- it works naturally with TypeScript
- it works naturally with ES modules
- it is fast
- it integrates well with Vite-era tooling

This project only uses Vitest on the backend right now, but the same tool could later be extended into frontend component tests if desired.

## 4. Test File Structure

The core service tests live in:

- `backend/src/pdfService.test.ts`

This file follows a good pattern:

- load fixtures once in `beforeAll`
- group tests by function
- assert both success and failure behavior

Example groupings:

- `getPageCount`
- `mergePdfs`
- `splitPdfToIndividualPages`
- `extractPagesToSinglePdf`
- `buildPdfFromDescriptors`
- `splitPdfFromDescriptors`

## 5. Why the Service Layer Is the Best Unit-Test Target

Notice that most tests target `pdfService.ts`, not Express routes.

That is intentional.

Why?

Because the service layer is:

- pure business logic
- easier to isolate
- easier to understand
- easier to debug

If you only test routes, failures mix together:

- upload parsing
- HTTP plumbing
- response headers
- PDF transformation logic

Service-layer tests keep the signal cleaner.

## 6. Using Real PDF Fixtures

The repository includes:

- `Test/sample-pdf-1page.pdf`
- `Test/sample-local-pdf-3pages.pdf`

These fixtures are valuable because they allow you to verify:

- real page counts
- multi-page splitting
- reordered extraction
- one-page edge cases

This is better than trying to mock everything.

A strong lesson here is:

`When working with binary document formats, realistic fixtures are often worth more than elaborate mocks.`

## 7. Types of Assertions We Use

### Page count assertions

These validate the shape of the output:

- did merge create the expected number of pages?
- did extraction create the expected count?

### Error assertions

These validate failure behavior:

- invalid page indices
- corrupt inputs
- unsupported states

### Structural behavior assertions

These validate logic, not just existence:

- duplicate page selection remains duplicate
- rotation is preserved
- full-document export still contains the correct number of pages

## 8. Why Duplicate Page Tests Matter

At first, duplicate page tests may seem unnecessary.

But they protect an important product decision:

If the user asks for the same page multiple times, should the app:

- silently deduplicate
- preserve the duplicates

PDFicasso preserves duplicates in several export paths.

That means duplicate tests are not trivial. They lock in product behavior.

This is an important testing lesson:

`Tests should protect product decisions, not just code branches.`

## 9. Why Rotation Tests Matter

The P1 editor introduced rotation support.

A page could now be:

- selected
- reordered
- rotated
- exported

If you only tested page count, you could still ship a broken rotation pipeline.

That is why the tests verify the resulting page rotation angle after rebuild and split operations.

## 10. Why Preview Tests Matter

Preview generation is not just UI decoration. It is part of the document workflow.

If preview generation drifts from export behavior, users may see one thing in the editor and download another.

Testing preview output ensures:

- one preview per page
- preview documents remain valid PDFs

## 11. Common Testing Lessons from This Project

### Lesson 1: compiled artifacts can poison test resolution

This project previously ran into stale compiled output issues.

If `.js` or `.d.ts` artifacts live in the wrong place, tests may import old code instead of source code.

That is why:

- output belongs in `dist`
- `dist` should be excluded from source compilation inputs

### Lesson 2: build settings matter to test stability

A test suite is only trustworthy if the build setup is clean.

### Lesson 3: strict TypeScript improves tests too

The backend uses strict typing. That catches mistakes in:

- descriptor payloads
- optional fields
- array access assumptions

before runtime.

## 12. What Is Still Not Covered

The current suite is strong at the service layer, but there are still gaps you could fill later:

### API-level tests

These would validate:

- route behavior
- response codes
- ZIP headers
- encrypted-PDF error payloads

### Frontend tests

These could validate:

- page selection syncing
- export settings behavior
- export settings behavior
- status banner rendering

### End-to-end tests

These would validate the full user journey in a browser.

For example:

- upload a PDF
- rotate a page
- delete a page
- export the edited document

## 13. A Good Testing Expansion Path

If you want to deepen this project later, a strong order would be:

1. API route tests for Express
2. frontend component tests for editor behavior
3. end-to-end browser tests

That sequence adds confidence from inside out.

## 14. Running Tests in Different Contexts

### Local backend run

```bash
cd backend
npm run test
```

### CI run

The Jenkins pipeline runs backend tests in a Node container before deployment.

That means the tests are not just local developer checks. They are part of the delivery gate.

## 15. Key Learning Takeaways

1. Test the service layer first when working with document transformations.
2. Real file fixtures are extremely valuable for PDF work.
3. Good tests protect both technical correctness and product decisions.
4. Build hygiene affects test trustworthiness.
5. Page count alone is not enough once editing features exist.
