import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getPageCount, mergePdfs, splitPdfToIndividualPages } from './pdfService.js';

describe('PDF Service', () => {
  let onePagePdf: Buffer;
  let threePagePdf: Buffer;
  let corruptPdf: Buffer;

  beforeAll(() => {
    const testDir = path.resolve(__dirname, '../../Test');
    onePagePdf = fs.readFileSync(path.join(testDir, 'sample-pdf-1page.pdf'));
    threePagePdf = fs.readFileSync(path.join(testDir, 'sample-local-pdf-3pages.pdf'));
    corruptPdf = Buffer.from('This is not a PDF file content');
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

    it('should throw an error for a corrupt PDF', async () => {
      await expect(getPageCount(corruptPdf)).rejects.toThrow();
    });
  });

  describe('mergePdfs', () => {
    it('should merge a 1-page and 3-page PDF into a 4-page PDF', async () => {
      const mergedBuffer = await mergePdfs([onePagePdf, threePagePdf]);
      const mergedPageCount = await getPageCount(mergedBuffer);
      expect(mergedPageCount).toBe(4);
    });

    it('should merge the same file multiple times (Duplicate Merge)', async () => {
      const mergedBuffer = await mergePdfs([onePagePdf, onePagePdf, onePagePdf]);
      const mergedPageCount = await getPageCount(mergedBuffer);
      expect(mergedPageCount).toBe(3);
    });

    it('should throw an error when merging zero files', async () => {
      await expect(mergePdfs([])).rejects.toThrow('No PDFs provided');
    });

    it('should throw an error if one of the buffers is corrupt', async () => {
      await expect(mergePdfs([onePagePdf, corruptPdf])).rejects.toThrow('corrupted');
    });
  });

  describe('splitPdfToIndividualPages', () => {
    it('should extract specific pages correctly', async () => {
      const pagesToExtract = [0, 2];
      const splitBuffers = await splitPdfToIndividualPages(threePagePdf, pagesToExtract);

      expect(splitBuffers).toHaveLength(2);
      expect(splitBuffers[0]!.pageNum).toBe(1);
      expect(splitBuffers[1]!.pageNum).toBe(3);

      const page1Count = await getPageCount(splitBuffers[0]!.buffer);
      const page3Count = await getPageCount(splitBuffers[1]!.buffer);
      
      expect(page1Count).toBe(1);
      expect(page3Count).toBe(1);
    });

    it('should handle out-of-order page requests (e.g., 3, 1)', async () => {
      const pagesToExtract = [2, 0];
      const splitBuffers = await splitPdfToIndividualPages(threePagePdf, pagesToExtract);

      expect(splitBuffers).toHaveLength(2);
      expect(splitBuffers[0]!.pageNum).toBe(3);
      expect(splitBuffers[1]!.pageNum).toBe(1);
    });

    it('should throw an error for out-of-bounds page index', async () => {
      await expect(splitPdfToIndividualPages(threePagePdf, [10])).rejects.toThrow('Invalid page index');
    });

    it('should throw an error for negative page index', async () => {
      await expect(splitPdfToIndividualPages(threePagePdf, [-1])).rejects.toThrow('Invalid page index');
    });

    it('should throw an error for corrupt PDF input', async () => {
      await expect(splitPdfToIndividualPages(corruptPdf, [0])).rejects.toThrow('corrupted');
    });
  });
});
