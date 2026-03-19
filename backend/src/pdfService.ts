import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

export type PageDescriptor = {
  pageIndex: number;
  rotation?: number;
};

export type PdfInspection = {
  isEncrypted: boolean;
  pageCount: number;
};

export type ExportOptions = {
  optimize?: boolean;
  watermarkText?: string;
};

const ENCRYPTED_PDF_MESSAGE = 'Password-protected PDFs are detected but not supported yet. Please unlock the PDF and try again.';

export const getEncryptedPdfMessage = () => ENCRYPTED_PDF_MESSAGE;

const inspectLoadedPdf = async (pdfBuffer: Buffer): Promise<PdfInspection> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  return {
    isEncrypted: pdfDoc.isEncrypted,
    pageCount: pdfDoc.getPageCount()
  };
};

const loadPdf = async (pdfBuffer: Buffer) => {
  try {
    const inspection = await inspectLoadedPdf(pdfBuffer);
    if (inspection.isEncrypted) {
      throw new Error(ENCRYPTED_PDF_MESSAGE);
    }

    return await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch (error) {
    if (error instanceof Error && error.message === ENCRYPTED_PDF_MESSAGE) {
      throw error;
    }
    throw new Error('Failed to load the PDF buffer. It might be corrupted.');
  }
};

const normalizeRotation = (rotation: number | undefined) => {
  const normalized = rotation ?? 0;
  return ((normalized % 360) + 360) % 360;
};

const buildPdfFromPageDescriptors = async (
  pdfDoc: PDFDocument,
  pages: PageDescriptor[],
  options?: ExportOptions
): Promise<Buffer> => {
  const pageCount = pdfDoc.getPageCount();
  const nextPdf = await PDFDocument.create();

  for (const descriptor of pages) {
    if (!Number.isInteger(descriptor.pageIndex) || descriptor.pageIndex < 0 || descriptor.pageIndex >= pageCount) {
      throw new Error(`Invalid page index: ${descriptor.pageIndex}. PDF only has ${pageCount} pages.`);
    }

    const [copiedPage] = await nextPdf.copyPages(pdfDoc, [descriptor.pageIndex]);
    if (!copiedPage) {
      throw new Error(`Failed to copy page index: ${descriptor.pageIndex}.`);
    }
    copiedPage.setRotation(degrees(normalizeRotation(descriptor.rotation)));
    nextPdf.addPage(copiedPage);
  }

  if (options?.watermarkText?.trim()) {
    const watermarkText = options.watermarkText.trim();
    const font = await nextPdf.embedFont(StandardFonts.HelveticaBold);

    nextPdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const fontSize = Math.max(18, Math.min(48, Math.round(Math.min(width, height) / 9)));
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

      page.drawText(watermarkText, {
        x: Math.max(24, (width - textWidth) / 2),
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(0.78, 0.16, 0.44),
        opacity: 0.18,
        rotate: degrees(35),
      });
    });
  }

  const pdfBytes = await nextPdf.save({ useObjectStreams: options?.optimize ?? true });
  return Buffer.from(pdfBytes);
};

export const inspectPdfBuffer = async (pdfBuffer: Buffer): Promise<PdfInspection> => {
  try {
    return await inspectLoadedPdf(pdfBuffer);
  } catch (error) {
    throw new Error('Failed to inspect the PDF buffer. It might be corrupted.');
  }
};

export const mergePdfs = async (pdfBuffers: Buffer[]): Promise<Buffer> => {
  if (!pdfBuffers || pdfBuffers.length === 0) {
    throw new Error('No PDFs provided for merging.');
  }
  
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    try {
      const pdfToMerge = await loadPdf(buffer);
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      if (error instanceof Error && error.message === ENCRYPTED_PDF_MESSAGE) {
        throw error;
      }
      throw new Error('Failed to load one of the PDF buffers. It might be corrupted.');
    }
  }

  const mergedPdfFile = await mergedPdf.save();
  return Buffer.from(mergedPdfFile);
};

export const getPageCount = async (pdfBuffer: Buffer): Promise<number> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  return pdfDoc.getPageCount();
};

export const getPageDescriptors = async (pdfBuffer: Buffer): Promise<PageDescriptor[]> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  return pdfDoc.getPageIndices().map((pageIndex) => ({ pageIndex, rotation: 0 }));
};

export const getPdfPagePreviewBuffers = async (
  pdfBuffer: Buffer
): Promise<{ pageIndex: number; buffer: Buffer }[]> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  const previews: { pageIndex: number; buffer: Buffer }[] = [];

  for (const pageIndex of pdfDoc.getPageIndices()) {
    const buffer = await buildPdfFromPageDescriptors(pdfDoc, [{ pageIndex, rotation: 0 }]);
    previews.push({ pageIndex, buffer });
  }

  return previews;
};

export const splitPdfToIndividualPages = async (
  pdfBuffer: Buffer,
  pagesToExtract: number[]
): Promise<{ pageNum: number; buffer: Buffer }[]> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  const results: { pageNum: number; buffer: Buffer }[] = [];

  for (const pageIndex of pagesToExtract) {
    const buffer = await buildPdfFromPageDescriptors(pdfDoc, [{ pageIndex, rotation: 0 }]);
    results.push({ pageNum: pageIndex + 1, buffer });
  }

  return results;
};

export const extractPagesToSinglePdf = async (
  pdfBuffer: Buffer,
  pagesToExtract: number[],
  options?: ExportOptions
): Promise<Buffer> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  return buildPdfFromPageDescriptors(
    pdfDoc,
    pagesToExtract.map((pageIndex) => ({ pageIndex, rotation: 0 })),
    options
  );
};

export const buildPdfFromDescriptors = async (
  pdfBuffer: Buffer,
  descriptors: PageDescriptor[],
  options?: ExportOptions
): Promise<Buffer> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  return buildPdfFromPageDescriptors(pdfDoc, descriptors, options);
};

export const splitPdfFromDescriptors = async (
  pdfBuffer: Buffer,
  descriptors: PageDescriptor[],
  options?: ExportOptions
): Promise<{ pageNum: number; buffer: Buffer }[]> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  const results: { pageNum: number; buffer: Buffer }[] = [];

  for (const descriptor of descriptors) {
    const buffer = await buildPdfFromPageDescriptors(pdfDoc, [descriptor], options);
    results.push({ pageNum: descriptor.pageIndex + 1, buffer });
  }

  return results;
};

export const optimizePdf = async (pdfBuffer: Buffer): Promise<Buffer> => {
  const pdfDoc = await loadPdf(pdfBuffer);
  return buildPdfFromPageDescriptors(
    pdfDoc,
    pdfDoc.getPageIndices().map((pageIndex) => ({ pageIndex, rotation: 0 })),
    { optimize: true }
  );
};
