import express from 'express';
import cors from 'cors';
import multer from 'multer';
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
// Hello world route
app.get('/', (req, res) => {
    res.send('PDF Splitter & Merger API is running!');
});
import { mergePdfs, splitPdf } from './pdfService.js';
// Merge route: accepts multiple files
app.post('/api/merge', upload.array('pdfs', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).send('Please upload at least 2 PDFs to merge.');
        }
        // Convert the Multer files into an array of Buffers
        const buffers = req.files.map(file => file.buffer);
        const mergedBuffer = await mergePdfs(buffers);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="merged.pdf"',
            'Content-Length': mergedBuffer.length,
        });
        res.send(mergedBuffer);
    }
    catch (error) {
        console.error("Error merging PDFs:", error);
        res.status(500).send('Internal Server Error while merging.');
    }
});
// Split route: accepts a single file and a page string
app.post('/api/split', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('Please upload a PDF to split.');
        }
        // The user will send a comma-separated list of 0-indexed pages
        const pagesString = req.body.pages;
        if (!pagesString) {
            return res.status(400).send('Please provide the pages to extract.');
        }
        const pagesArray = pagesString.split(',').map((p) => parseInt(p.trim()));
        const splitBuffer = await splitPdf(req.file.buffer, pagesArray);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="split.pdf"',
            'Content-Length': splitBuffer.length,
        });
        res.send(splitBuffer);
    }
    catch (error) {
        console.error("Error splitting PDF:", error);
        res.status(500).send('Internal Server Error while splitting.');
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
//# sourceMappingURL=index.js.map