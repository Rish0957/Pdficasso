import { PDFDocument } from 'pdf-lib';

export const mergePdfs = async (pdfBuffers: Buffer[]): Promise<Buffer> => {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const pdfToMerge = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
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
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const results: { pageNum: number; buffer: Buffer }[] = [];

  for (const pageIndex of pagesToExtract) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(copiedPage);
    const pdfBytes = await newPdf.save();
    results.push({ pageNum: pageIndex + 1, buffer: Buffer.from(pdfBytes) });
  }

  return results;
};
