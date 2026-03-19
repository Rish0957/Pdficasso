import { PDFDocument } from 'pdf-lib';

export const mergePdfs = async (pdfBuffers: Buffer[]): Promise<Buffer> => {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const pdfToMerge = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfFile = await mergedPdf.save();
  return Buffer.from(mergedPdfFile);
};

export const splitPdf = async (pdfBuffer: Buffer, pagesToExtract: number[]): Promise<Buffer> => {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const newPdf = await PDFDocument.create();

    // Copy specific pages (0-indexed)
    const copiedPages = await newPdf.copyPages(pdfDoc, pagesToExtract);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
}
