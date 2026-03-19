# 📝 01 - The Application Architecture

Before automating a deployment pipeline, it's crucial to understand what the application actually does and how the pieces communicate. 

Pdficasso is broken into two distinct environments: the **Frontend** (what the user sees) and the **Backend** (the server that processes the PDFs).

---

## 🖥️ 1. The Frontend (React + Vite)
The frontend is built using **React** (a UI library) and initialized using **Vite** (a blazing-fast build tool). 

- **Why React?** It allows us to build dynamic interfaces like the grid of PDF pages where states changes instantly without reloading the page.
- **Styling:** We use **Tailwind CSS**. Instead of writing raw CSS files, we use utility classes directly in the HTML (e.g., `bg-neutral-900 border-2`).
- **Communication:** The frontend cannot process PDFs itself. When a user drops a file, we use **Axios** (an HTTP client) to send a `POST` request with a `FormData` object containing the file to the Backend.

### Key File
* `frontend/src/App.tsx`: The entire UI flow and Axios API requests live here.

---

## ⚙️ 2. The Backend (Node.js + Express)
The backend is a lightweight HTTP server built with **Express.js**. Its job is to listen for requests from the React frontend, perform the heavy lifting, and return the result.

- **Handling Uploads (`multer`):** Browsers send files as binary streams. `multer` is a middleware that intercepts these streams and converts them into Javascript `Buffer` objects in system memory (RAM). This is also where we enforce our **50MB** size limit.
- **Manipulating PDFs (`pdf-lib`):** We use this library because it doesn't require any native system dependencies (like Java or Python). It allows us to load the `Buffer` from `multer`, copy specific pages out of it, and generate a new mutated PDF.
- **Handling ZIPs (`archiver`):** For the split function, we generate multiple mutated PDFs. We stream these directly into a generated `.zip` archive to send back to the user. 

### Key Files
* `backend/src/index.ts`: The Express server and API routes (`/api/merge`, `/api/split`).
* `backend/src/pdfService.ts`: The pure logic for actually manipulating the PDF bytes.

---

## 🔄 The Interaction Loop
1. User clicks **"Merge"** on the Frontend.
2. React fires an `axios.post('http://localhost:3001/api/merge')` with the files.
3. Express receives the request. `multer` takes the files and puts them in RAM.
4. Express passes the RAM Buffers to `mergePdfs()`.
5. `pdf-lib` merges them and returns a single new Buffer.
6. Express sets the `Content-Type: application/pdf` header and sends the Buffer as the HTTP response.
7. React receives the binary `Blob` response and triggers a hidden `<a download="merged.pdf">` click to save it to the user's hard drive.
