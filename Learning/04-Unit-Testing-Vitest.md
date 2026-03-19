# 🧪 04 - Unit Testing with Vitest

Before automating anything, you need **tests** — otherwise the pipeline has nothing to verify. We use **Vitest** because it natively understands TypeScript and ES Modules, which makes it the perfect companion for our Vite-based stack.

---

## Why Test?

Without tests, your CI pipeline is just a fancy build script. Tests answer: *"Does the code actually produce the correct output?"*

| Without Tests | With Tests |
|---|---|
| "It compiled, ship it!" | "It compiled AND the merge logic produces a 4-page PDF from a 1-page + 3-page input." |

---

## Setup

```bash
# Install Vitest as a dev dependency
npm install -D vitest

# Update package.json scripts
"test": "vitest run"        # Run once and exit (for CI)
"test:watch": "vitest"      # Watch mode (for development)
```

---

## Anatomy of a Test File

Our test file is `backend/src/pdfService.test.ts`. Here's the structure:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { getPageCount, mergePdfs, splitPdfToIndividualPages } from './pdfService.js';

describe('PDF Service', () => {
  let onePagePdf: Buffer;
  let threePagePdf: Buffer;

  // beforeAll runs ONCE before all tests in this block
  beforeAll(() => {
    onePagePdf = fs.readFileSync('path/to/sample-pdf-1page.pdf');
    threePagePdf = fs.readFileSync('path/to/sample-local-pdf-3pages.pdf');
  });

  describe('getPageCount', () => {
    it('should correctly count pages in a 1-page PDF', async () => {
      const count = await getPageCount(onePagePdf);
      expect(count).toBe(1);    // ← This is an "assertion"
    });
  });
});
```

### Key Concepts

| Concept | What it does |
|---|---|
| `describe()` | Groups related tests together (like a folder) |
| `it()` | Defines a single test case |
| `expect().toBe()` | **Assertion** — if the value doesn't match, the test fails |
| `beforeAll()` | Setup code that runs once before all tests |

---

## What We Test

We wrote **4 tests** against 2 real PDF files you provided:

1. **Page Count (1-page PDF)** — Verifies `getPageCount` returns `1`
2. **Page Count (3-page PDF)** — Verifies `getPageCount` returns `3`
3. **Merge** — Merges the 1-page + 3-page PDF and verifies the result has `4` pages
4. **Split** — Extracts pages 1 and 3 from the 3-page PDF and verifies each output is a valid 1-page PDF

---

## ⚠️ Gotcha: Stale Compiled Files

We hit a frustrating bug where tests kept failing with `getPageCount is not a function` even though the source code was correct.

**Root cause**: Old compiled `.js` files were sitting in the `src/` directory from a previous `tsc` run that output directly into `src/` instead of `dist/`. Vitest resolved the `.js` import (`pdfService.js`) and loaded the **stale compiled version** instead of the TypeScript source.

**Fix**: Deleted all `*.js`, `*.js.map`, and `*.d.ts` files from `src/`.

> **🔑 Lesson**: Always ensure your `tsconfig.json` has `"outDir": "./dist"` set, and keep your source directory clean of compiled artifacts.

---

## Running Tests

```bash
cd backend
npm test          # Runs all tests once
```

Expected output:
```
 ✓ src/pdfService.test.ts (4 tests) 66ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```
