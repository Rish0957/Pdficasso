import express from 'express';
import cors from 'cors';
import multer from 'multer';
import archiver from 'archiver';
import { mergePdfs, splitPdfToIndividualPages, getPageCount } from './pdfService.js';

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
    const pageCount = await getPageCount(req.file.buffer);
    res.json({ pageCount, fileName: req.file.originalname });
  } catch (error) {
    console.error('Error reading PDF info:', error);
    res.status(500).json({ error: 'Failed to read PDF info.' });
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
    console.error("Error merging PDFs:", error);
    res.status(500).send('Internal Server Error while merging.');
  }
});

// Split route: returns a ZIP with individual page PDFs
app.post('/api/split', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Please upload a PDF to split.');
    }

    const pagesString = req.body.pages;
    if (!pagesString) {
      return res.status(400).send('Please provide the pages to extract.');
    }

    const pagesArray = pagesString.split(',').map((p: string) => parseInt(p.trim()));
    const originalName = req.file.originalname.replace(/\.pdf$/i, '');
    const splitPages = await splitPdfToIndividualPages(req.file.buffer, pagesArray);

    // Create a ZIP archive
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
    console.error('Error splitting PDF:', error);
    res.status(500).send('Internal Server Error while splitting.');
  }
});

app.listen(port as number, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
