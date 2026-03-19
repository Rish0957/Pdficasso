import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import {
  getPageCount,
  mergePdfs,
  splitPdfToIndividualPages,
  extractPagesToSinglePdf,
  buildPdfFromDescriptors,
  splitPdfFromDescriptors,
  getPdfPagePreviewBuffers,
  getPageDescriptors,
  inspectPdfBuffer,
  optimizePdf,
  getEncryptedPdfMessage
} from './pdfService.js';

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

    it('should allow duplicate page requests and return duplicate single-page PDFs', async () => {
      const splitBuffers = await splitPdfToIndividualPages(threePagePdf, [1, 1]);

      expect(splitBuffers).toHaveLength(2);
      expect(splitBuffers[0]!.pageNum).toBe(2);
      expect(splitBuffers[1]!.pageNum).toBe(2);

      const duplicatePageCount = await getPageCount(splitBuffers[0]!.buffer);
      expect(duplicatePageCount).toBe(1);
    });

    it('should split a one-page PDF into a single one-page result', async () => {
      const splitBuffers = await splitPdfToIndividualPages(onePagePdf, [0]);

      expect(splitBuffers).toHaveLength(1);
      expect(splitBuffers[0]!.pageNum).toBe(1);

      const pageCount = await getPageCount(splitBuffers[0]!.buffer);
      expect(pageCount).toBe(1);
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

  describe('getPageDescriptors', () => {
    it('should return one descriptor per page with zero rotation by default', async () => {
      const descriptors = await getPageDescriptors(threePagePdf);

      expect(descriptors).toEqual([
        { pageIndex: 0, rotation: 0 },
        { pageIndex: 1, rotation: 0 },
        { pageIndex: 2, rotation: 0 },
      ]);
    });
  });

  describe('inspectPdfBuffer', () => {
    it('should report page count and encryption status for a normal PDF', async () => {
      const inspection = await inspectPdfBuffer(threePagePdf);

      expect(inspection).toEqual({
        isEncrypted: false,
        pageCount: 3,
      });
    });

    it('should throw for corrupt PDF input', async () => {
      await expect(inspectPdfBuffer(corruptPdf)).rejects.toThrow();
    });
  });

  describe('getPdfPagePreviewBuffers', () => {
    it('should create one preview PDF per page', async () => {
      const previews = await getPdfPagePreviewBuffers(threePagePdf);

      expect(previews).toHaveLength(3);
      expect(previews[0]!.pageIndex).toBe(0);
      expect(await getPageCount(previews[2]!.buffer)).toBe(1);
    });
  });

  describe('extractPagesToSinglePdf', () => {
    it('should create a single PDF with the selected pages', async () => {
      const extractedBuffer = await extractPagesToSinglePdf(threePagePdf, [0, 2]);
      const pageCount = await getPageCount(extractedBuffer);

      expect(pageCount).toBe(2);
    });

    it('should create a full-document PDF when all pages are selected', async () => {
      const extractedBuffer = await extractPagesToSinglePdf(threePagePdf, [0, 1, 2]);
      const pageCount = await getPageCount(extractedBuffer);

      expect(pageCount).toBe(3);
    });

    it('should preserve duplicate selections in the extracted PDF', async () => {
      const extractedBuffer = await extractPagesToSinglePdf(threePagePdf, [2, 2, 0]);
      const pageCount = await getPageCount(extractedBuffer);

      expect(pageCount).toBe(3);
    });

    it('should support extracting from a one-page PDF', async () => {
      const extractedBuffer = await extractPagesToSinglePdf(onePagePdf, [0]);
      const pageCount = await getPageCount(extractedBuffer);

      expect(pageCount).toBe(1);
    });

    it('should throw an error for an invalid page index', async () => {
      await expect(extractPagesToSinglePdf(threePagePdf, [5])).rejects.toThrow('Invalid page index');
    });
  });

  describe('buildPdfFromDescriptors', () => {
    it('should reorder pages and preserve the requested output length', async () => {
      const rebuiltBuffer = await buildPdfFromDescriptors(threePagePdf, [
        { pageIndex: 2, rotation: 0 },
        { pageIndex: 0, rotation: 0 },
      ]);

      expect(await getPageCount(rebuiltBuffer)).toBe(2);
    });

    it('should apply page rotation to the rebuilt PDF', async () => {
      const rebuiltBuffer = await buildPdfFromDescriptors(onePagePdf, [
        { pageIndex: 0, rotation: 90 },
      ]);
      const rebuiltPdf = await PDFDocument.load(rebuiltBuffer, { ignoreEncryption: true });
      const rotation = rebuiltPdf.getPage(0).getRotation().angle;

      expect(rotation).toBe(90);
    });

    it('should throw when rebuilding with an invalid page index', async () => {
      await expect(
        buildPdfFromDescriptors(threePagePdf, [{ pageIndex: 9, rotation: 0 }])
      ).rejects.toThrow('Invalid page index');
    });

    it('should apply a watermark without changing page count', async () => {
      const rebuiltBuffer = await buildPdfFromDescriptors(
        threePagePdf,
        [{ pageIndex: 0, rotation: 0 }, { pageIndex: 1, rotation: 0 }],
        { watermarkText: 'CONFIDENTIAL', optimize: true }
      );

      expect(await getPageCount(rebuiltBuffer)).toBe(2);
    });
  });

  describe('splitPdfFromDescriptors', () => {
    it('should split rotated descriptors into one-page PDFs', async () => {
      const splitBuffers = await splitPdfFromDescriptors(threePagePdf, [
        { pageIndex: 1, rotation: 180 },
        { pageIndex: 0, rotation: 90 },
      ]);

      expect(splitBuffers).toHaveLength(2);
      expect(await getPageCount(splitBuffers[0]!.buffer)).toBe(1);

      const rotatedPdf = await PDFDocument.load(splitBuffers[1]!.buffer, { ignoreEncryption: true });
      expect(rotatedPdf.getPage(0).getRotation().angle).toBe(90);
    });
  });

  describe('optimizePdf', () => {
    it('should preserve page count when optimizing a PDF', async () => {
      const optimizedBuffer = await optimizePdf(threePagePdf);
      expect(await getPageCount(optimizedBuffer)).toBe(3);
    });
  });

  describe('getEncryptedPdfMessage', () => {
    it('should return a user-facing message for password-protected PDFs', () => {
      expect(getEncryptedPdfMessage()).toContain('Password-protected PDFs');
    });
  });
});
