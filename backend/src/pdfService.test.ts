import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getPageCount, mergePdfs, splitPdfToIndividualPages } from './pdfService.js';

describe('PDF Service', () => {
  let onePagePdf: Buffer;
  let threePagePdf: Buffer;

  beforeAll(() => {
    // Read the sample PDFs provided by the user
    // Tests are run from the backend folder, so we map relative to backend root
    const testDir = path.resolve(__dirname, '../../Test');
    onePagePdf = fs.readFileSync(path.join(testDir, 'sample-pdf-1page.pdf'));
    threePagePdf = fs.readFileSync(path.join(testDir, 'sample-local-pdf-3pages.pdf'));
  });

  describe('getPageCount', () => {
    it('should correctly count pages in a 1-page PDF', async () => {
      const count = await getPageCount(onePagePdf);
      expect(count).toBe(1);
    });

    it('should correctly count pages in a 3-page PDF', async () => {
      const count = await getPageCount(threePagePdf);
      expect(count).toBe(3);
    });
  });

  describe('mergePdfs', () => {
    it('should merge a 1-page and 3-page PDF into a 4-page PDF', async () => {
      // Merge them
      const mergedBuffer = await mergePdfs([onePagePdf, threePagePdf]);
      
      // Verify the result
      const mergedPageCount = await getPageCount(mergedBuffer);
      expect(mergedPageCount).toBe(4);
    });
  });

  describe('splitPdfToIndividualPages', () => {
    it('should extract specific pages correctly', async () => {
      // Extract the first (0) and third (2) pages from the 3-page PDF
      const pagesToExtract = [0, 2];
      const splitBuffers = await splitPdfToIndividualPages(threePagePdf, pagesToExtract);

      // Verify the array structure
      expect(splitBuffers).toHaveLength(2);
      expect(splitBuffers[0].pageNum).toBe(1); // 0-indexed becomes 1
      expect(splitBuffers[1].pageNum).toBe(3); // 2-indexed becomes 3

      // Verify each split buffer is a valid 1-page PDF
      const page1Count = await getPageCount(splitBuffers[0].buffer);
      const page2Count = await getPageCount(splitBuffers[1].buffer);
      
      expect(page1Count).toBe(1);
      expect(page2Count).toBe(1);
    });
  });
});
