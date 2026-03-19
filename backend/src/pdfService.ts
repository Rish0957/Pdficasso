import { PDFDocument } from 'pdf-lib';

export const mergePdfs = async (pdfBuffers: Buffer[]): Promise<Buffer> => {
  if (!pdfBuffers || pdfBuffers.length === 0) {
    throw new Error('No PDFs provided for merging.');
  }
  
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    try {
      const pdfToMerge = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      throw new Error('Failed to load one of the PDF buffers. It might be corrupted.');
    }
  }

  const mergedPdfFile = await mergedPdf.save();
  return Buffer.from(mergedPdfFile);
};

export const getPageCount = async (pdfBuffer: Buffer): Promise<number> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
};

export const splitPdfToIndividualPages = async (
  pdfBuffer: Buffer,
  pagesToExtract: number[]
): Promise<{ pageNum: number; buffer: Buffer }[]> => {
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch (error) {
    throw new Error('Failed to load the PDF buffer. It might be corrupted.');
  }

  const pageCount = pdfDoc.getPageCount();
  const results: { pageNum: number; buffer: Buffer }[] = [];

  for (const pageIndex of pagesToExtract) {
    if (pageIndex < 0 || pageIndex >= pageCount) {
      throw new Error(`Invalid page index: ${pageIndex}. PDF only has ${pageCount} pages.`);
    }

    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(copiedPage);
    const pdfBytes = await newPdf.save();
    results.push({ pageNum: pageIndex + 1, buffer: Buffer.from(pdfBytes) });
  }

  return results;
};
