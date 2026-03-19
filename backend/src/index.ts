import express from 'express';
import cors from 'cors';
import multer from 'multer';
import archiver from 'archiver';
import {
  mergePdfs,
  splitPdfToIndividualPages,
  getPageCount,
  extractPagesToSinglePdf,
  getPdfPagePreviewBuffers,
  getPageDescriptors,
  buildPdfFromDescriptors,
  splitPdfFromDescriptors,
  inspectPdfBuffer,
  optimizePdf,
  getEncryptedPdfMessage,
  type PageDescriptor,
  type ExportOptions
} from './pdfService.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for PDFs just for the demo
const storage = multer.memoryStorage();

// 50MB file size limit enforced by multer
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const parsePageDescriptorPayload = (rawPayload: unknown): PageDescriptor[] | null => {
  if (typeof rawPayload !== 'string' || rawPayload.trim() === '') {
    return null;
  }

  const parsed = JSON.parse(rawPayload);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid page descriptor payload.');
  }

  return parsed.map((item) => ({
    pageIndex: Number(item?.pageIndex),
    rotation: Number(item?.rotation ?? 0)
  }));
};

const parseExportOptions = (body: Record<string, unknown>): ExportOptions => {
  const options: ExportOptions = {
    optimize: body.optimize === 'true' || body.optimize === true
  };

  if (typeof body.watermarkText === 'string' && body.watermarkText.trim()) {
    options.watermarkText = body.watermarkText.trim();
  }

  return options;
};

const handlePdfError = (error: unknown, res: express.Response, fallbackMessage: string) => {
  console.error(fallbackMessage, error);

  if (error instanceof Error && error.message === getEncryptedPdfMessage()) {
    return res.status(400).json({ error: error.message, code: 'ENCRYPTED_PDF' });
  }

  return res.status(500).json({ error: fallbackMessage });
};

const setSizeHeaders = (res: express.Response, originalSize: number, outputSize: number) => {
  const savedBytes = originalSize - outputSize;
  const savedPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(2) : '0.00';

  res.set({
    'X-Original-Size': String(originalSize),
    'X-Output-Size': String(outputSize),
    'X-Saved-Bytes': String(savedBytes),
    'X-Saved-Percent': savedPercent,
  });
};

// Health check
app.get('/', (req, res) => {
  res.send('PDFicasso API is running!');
});

// Get PDF page count
app.post('/api/pdf-info', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF.' });
    }
    const inspection = await inspectPdfBuffer(req.file.buffer);
    if (inspection.isEncrypted) {
      return res.status(400).json({ error: getEncryptedPdfMessage(), code: 'ENCRYPTED_PDF' });
    }

    const pageCount = await getPageCount(req.file.buffer);
    const [previews, pages] = await Promise.all([
      getPdfPagePreviewBuffers(req.file.buffer),
      getPageDescriptors(req.file.buffer)
    ]);

    res.json({
      pageCount,
      fileName: req.file.originalname,
      pages: pages.map((page, index) => ({
        id: `${page.pageIndex}`,
        pageIndex: page.pageIndex,
        rotation: page.rotation ?? 0,
        previewUrl: `data:application/pdf;base64,${previews[index]!.buffer.toString('base64')}`
      }))
    });
  } catch (error) {
    return handlePdfError(error, res, 'Failed to read PDF info.');
  }
});

// Merge route: accepts multiple files
app.post('/api/merge', upload.array('pdfs', 10), async (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length < 2) {
      return res.status(400).send('Please upload at least 2 PDFs to merge.');
    }

    // Convert the Multer files into an array of Buffers
    const buffers = (req.files as Express.Multer.File[]).map(file => file.buffer);
    const mergedBuffer = await mergePdfs(buffers);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
      'Content-Length': mergedBuffer.length,
    });

    res.send(mergedBuffer);
  } catch (error) {
    const result = handlePdfError(error, res, 'Internal Server Error while merging.');
    return result;
  }
});

// Split route: returns a ZIP with individual page PDFs
app.post('/api/split', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Please upload a PDF to split.');
    }

    const pageDescriptors =
      parsePageDescriptorPayload(req.body.pageDescriptors) ??
      (() => {
        const pagesString = req.body.pages;
        if (!pagesString) {
          return null;
        }

        const pagesArray = pagesString
          .split(',')
          .map((p: string) => parseInt(p.trim(), 10))
          .filter((pageNum: number) => Number.isInteger(pageNum));

        if (pagesArray.length === 0) {
          return null;
        }

        return pagesArray.map((pageIndex: number) => ({ pageIndex, rotation: 0 }));
      })();

    if (!pageDescriptors || pageDescriptors.length === 0) {
      return res.status(400).send('Please provide at least one valid page.');
    }

    const outputMode = req.body.outputMode === 'single' ? 'single' : 'zip';
    const originalName = req.file.originalname.replace(/\.pdf$/i, '');
    const exportOptions = parseExportOptions(req.body);

    if (outputMode === 'single') {
      const extractedPdf =
        req.body.pageDescriptors
          ? await buildPdfFromDescriptors(req.file.buffer, pageDescriptors, exportOptions)
          : await extractPagesToSinglePdf(
              req.file.buffer,
              pageDescriptors.map(({ pageIndex }: PageDescriptor) => pageIndex),
              exportOptions
            );
      setSizeHeaders(res, req.file.size, extractedPdf.length);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}_extracted.pdf"`,
        'Content-Length': extractedPdf.length,
      });

      return res.send(extractedPdf);
    }

    const splitPages =
      req.body.pageDescriptors
        ? await splitPdfFromDescriptors(req.file.buffer, pageDescriptors, exportOptions)
        : await splitPdfToIndividualPages(
            req.file.buffer,
            pageDescriptors.map(({ pageIndex }: PageDescriptor) => pageIndex)
          );
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${originalName}_splitted.zip"`,
    });

    archive.pipe(res);

    for (const page of splitPages) {
      archive.append(page.buffer, { name: `${originalName}_page_${page.pageNum}.pdf` });
    }

    await archive.finalize();
  } catch (error) {
    const result = handlePdfError(error, res, 'Internal Server Error while splitting.');
    return result;
  }
});

app.post('/api/rebuild', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Please upload a PDF to rebuild.');
    }

    const pageDescriptors = parsePageDescriptorPayload(req.body.pageDescriptors);
    if (!pageDescriptors || pageDescriptors.length === 0) {
      return res.status(400).send('Please provide page changes to apply.');
    }

    const rebuiltPdf = await buildPdfFromDescriptors(req.file.buffer, pageDescriptors, parseExportOptions(req.body));
    const originalName = req.file.originalname.replace(/\.pdf$/i, '');

    setSizeHeaders(res, req.file.size, rebuiltPdf.length);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${originalName}_edited.pdf"`,
      'Content-Length': rebuiltPdf.length,
    });

    return res.send(rebuiltPdf);
  } catch (error) {
    const result = handlePdfError(error, res, 'Internal Server Error while rebuilding.');
    return result;
  }
});

app.post('/api/optimize', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Please upload a PDF to optimize.');
    }

    const optimizedPdf = await optimizePdf(req.file.buffer);
    const originalName = req.file.originalname.replace(/\.pdf$/i, '');

    setSizeHeaders(res, req.file.size, optimizedPdf.length);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${originalName}_optimized.pdf"`,
      'Content-Length': optimizedPdf.length,
    });

    return res.send(optimizedPdf);
  } catch (error) {
    const result = handlePdfError(error, res, 'Internal Server Error while optimizing.');
    return result;
  }
});

app.listen(port as number, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
