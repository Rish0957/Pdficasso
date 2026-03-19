# 📄 PDFicasso

**PDFicasso** is a premium, high-performance tool for merging and splitting PDF files, designed with a focus on **DevSecOps** and **CI/CD** best practices.

---

## ✨ Features

- **Dynamic Merge** — Upload multiple PDFs and combine them securely.
- **Premium Split Grid** — High-end UI to select specific pages for extraction.
- **Auto-ZIP Packaging** — Split pages are automatically packaged into a single ZIP for convenient downloading.
- **In-Memory Processing** — Files are never stored on disk. 🔒
- **50MB Limit** — Robust validation on both Frontend and Backend.
- **One-Click Dev** — Fully Dockerized for immediate local development.

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React (Vite), TypeScript, Tailwind CSS |
| Backend    | Node.js (Express), TypeScript       |
| PDF Engine | `pdf-lib`                           |
| CI/CD      | Jenkins, Docker, GitHub             |

---

## 📁 Project Structure

```
Pdficasso/
├── backend/              # Node.js API server (Express)
├── frontend/             # React UI (Vite)
├── Learning/             # 📚 Educational Guides & DevSecOps Docs
├── Test/                 # Backend Unit & Integration Tests
├── docker-compose.yml    # Orchestration for Dev, Staging, & Prod
├── Jenkinsfile           # Multi-environment CI/CD pipeline
├── start_prod.bat        # One-click Dockerized Dev script
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- [Git](https://git-scm.com/) installed.

### Quick Start (Stable Dev)
Simply **double-click** `start_prod.bat` in the project root. This will:
1.  Clean up any existing `pdficasso-dev` containers.
2.  Perform a fresh, cached build of both services.
3.  Launch the **Frontend** on `http://localhost:8082`.
4.  Launch the **Backend** on `http://localhost:3001`.

---

## 📚 Learning & DevSecOps
This project is built to demonstrate a professional transition to containerized CI/CD. Explore the `Learning/` folder for in-depth technical guides:

- **[01-Architecture](https://github.com/Rish0957/Pdficasso/blob/main/Learning/01-React-Node-Architecture.md)**: Logic and data flow.
- **[02-Docker](https://github.com/Rish0957/Pdficasso/blob/main/Learning/02-Docker-Containerization.md)**: Multi-stage builds and orchestration.
- **[03-Git-Branching](https://github.com/Rish0957/Pdficasso/blob/main/Learning/03-Git-Branching-Strategy.md)**: Branch management and PR workflows.
- **[04-Testing](https://github.com/Rish0957/Pdficasso/blob/main/Learning/04-Unit-Testing-Vitest.md)**: Robust unit testing with Vitest.
- **[05-Jenkins](https://github.com/Rish0957/Pdficasso/blob/main/Learning/05-Jenkins-CICD-Pipeline.md)**: Pipeline-as-code and multi-environment deployment.
- **[06-Multi-Environment](https://github.com/Rish0957/Pdficasso/blob/main/Learning/06-Multi-Environment-Stack.md)**: Configuration management and port isolation.

---

## 🔒 Security & Performance
- **Zero Storage**: Processing is entirely in-memory.
- **Port Isolation**: Docker ensures Dev, Staging, and Production never collide.
- **Nginx Proxy**: Frontend uses a reverse proxy to eliminate CORS and complex port baking.

---

## 👨‍💻 Developer
**Rishabh Khandelwal**  
[GitHub](https://github.com/Rish0957)

---

## 📜 License
MIT
