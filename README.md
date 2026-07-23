# CommitVerse — 3D Git History Visualizer

A real-time **3D visualization platform** for exploring any Git repository's history.

Simply paste a GitHub repository URL (or a local repository path) and watch the project evolve **commit-by-commit** and **file-by-file** inside an interactive 3D graph. CommitVerse lets you inspect files, replay repository history, explore contributor relationships, and even ask an AI assistant questions about the repository based on the commit history being visualized.

Built with **React 19**, **React Three Fiber**, **Three.js**, **D3 Force 3D**, **Express**, and **Socket.IO**.

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r183-black?logo=three.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socketdotio)

---

## ✨ Features

### 🌌 Live 3D Git Visualization

- Visualize repository history as an animated 3D graph
- Directories and files appear as commits are streamed
- Physics simulation powered by **d3-force-3d**
- Runs inside a Web Worker for smooth rendering

### ⏯ Timeline Playback

- Pause and resume playback
- Replay repository history
- Scrub through commits
- Playback speeds from **1× to 25×**

### 👥 Contributor Network

Switch from the filesystem graph to a contributor relationship graph showing how authors are connected through shared files.

### 📁 File Inspection

Click any file or directory to view:

- Commit history
- Recent modifications
- Author information

### 🤖 AI Repository Assistant

Ask natural-language questions such as:

- Who are the top contributors?
- Which files changed the most?
- Summarize the project structure.
- What happened in the most recent commits?
- Which folders evolved the fastest?

Responses are grounded in the repository's actual commit history.

### 🔍 Filtering

Filter the visualization by:

- Branch
- Author

### 🌐 Two Data Modes

#### Local Clone Mode

- Clone any public GitHub repository
- Supports local repositories
- Streams the complete commit history in real time

#### Serverless Mode

Uses the GitHub REST API.

Ideal for:

- Static hosting
- Vercel deployments
- GitHub Pages

---

# 🚀 Prerequisites

- Node.js **18+**
- Git installed and available in your system `PATH`
- OpenRouter API key (for AI chat)

---

# 📦 Installation

```bash
cd "git visualizer"
npm install
```

---

# 🔑 Configure the AI Assistant

Create a `.env` file inside the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key
```

Install and configure **dotenv** if not already present:

```bash
npm install dotenv
```

Then load it inside `server.js`:

```javascript
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
```

> ⚠️ **Important**
>
> Never commit your API key.
>
> If you previously hardcoded an OpenRouter key inside `server.js`, revoke it immediately from the OpenRouter dashboard and replace it with an environment variable.

---

# ▶ Running the Project

Open **two terminals**.

## Terminal 1 — Backend

```bash
npm run server
```

Expected output:

```text
✅ CommitVerse server → http://localhost:3001
```

---

## Terminal 2 — Frontend

```bash
npm run dev
```

Expected output:

```text
➜ Local: http://localhost:5173
```

Open:

```
http://localhost:5173
```

---

# 🌍 Visualizing a Repository

1. Paste a GitHub repository URL.

Example repositories:

```
https://github.com/vuejs/vue

https://github.com/expressjs/express

https://github.com/facebook/react

https://github.com/microsoft/vscode
```

2. Press **Visualize**.

The backend will:

- Clone the repository (blob-less shallow clone)
- Parse Git history
- Stream commits to the browser
- Animate repository growth in real time

### Local Repository

You can also visualize a local repository by providing an absolute path.

Example:

```text
C:\Users\you\projects\myapp
```

The folder must contain a valid `.git` directory.

---

# 🎮 Scene Legend

| Object | Meaning |
|---------|---------|
| 🟢 Large translucent sphere | Directory |
| 🔵 Small colored sphere | File (color indicates file type) |
| 🟠 Pulsing orbital ring | Currently modified node |
| ✨ Flowing particles | Commit propagation |

Click any node to inspect its commit history.

---

# 🤖 AI Chat

Open the AI assistant using the **🤖** button.

The assistant receives context including:

- Repository structure
- Contributors
- File statistics
- Recent commits
- File type information

Example questions:

```
Who are the top contributors?

Which files changed the most?

Summarize this project.

Explain the latest commits.

Which folders receive the most activity?
```

---

# 🎛 Controls

| Action | Control |
|----------|---------|
| Rotate camera | Left-click + drag |
| Zoom | Mouse wheel |
| Inspect node | Click a sphere |
| Pause / Resume | ⏸ / ▶ |
| Replay | ↺ |
| Playback speed | 2×, 5×, 10×, 25× |
| AI panel | 🤖 |
| Contributor network | Network icon |

---

# 📊 Recommended Repositories

| Repository | Approx. Commits | Clone Time | Visualization |
|-------------|----------------:|------------|---------------|
| expressjs/express | ~5,500 | ~10 s | ✅ Excellent |
| vuejs/vue | ~3,200 | ~8 s | ✅ Excellent |
| facebook/react | ~16,000 | ~20 s | ✅ Good |
| microsoft/vscode | ~110,000 | ~2 min | ⚠ Heavy |
| torvalds/linux | ~1.1 M | ~30 min | ❌ Not Recommended |

For the best experience, begin with smaller repositories before exploring very large projects.

---

# 📂 Project Structure

```text
git visualizer/
│
├── server.js
│
├── src/
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── GourceScene.tsx
│   │   ├── ContributorNetwork.tsx
│   │   ├── AIChatPanel.tsx
│   │   ├── CommitDetailModal.tsx
│   │   ├── TopBar.tsx
│   │   ├── BottomBar.tsx
│   │   ├── LeftPanel.tsx
│   │   └── UIOverlay.tsx
│   │
│   ├── hooks/
│   │   └── useGraph.ts
│   │
│   ├── workers/
│   │   └── physics.worker.ts
│   │
│   └── lib/
│       └── githubApi.ts
│
└── package.json
```

---

# 🛠 Tech Stack

- React 19
- TypeScript
- React Three Fiber
- Three.js
- D3 Force 3D
- Web Workers
- Express
- Socket.IO
- OpenRouter API
- Git CLI

---

# 🐞 Troubleshooting

| Problem | Solution |
|----------|----------|
| Blank canvas | Ensure the backend is running on port **3001** |
| Git clone failed | Verify internet connectivity and repository visibility |
| No `.git` folder found | Confirm the provided local path is a Git repository |
| AI not responding | Verify `OPENROUTER_API_KEY` is configured and the backend is running |
| Slow visualization | Reduce playback speed or use a smaller repository |

---

# 🗺 Roadmap

Future improvements include:

- Repository comparison mode
- Commit heatmaps
- Branch timeline visualization
- Search by file or commit
- GitHub authentication for private repositories
- Export animations as video or GIF
- VR/AR visualization support
- Performance optimizations for repositories with 100k+ commits

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "Add amazing feature"
```

4. Push to GitHub

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

Feel free to use, modify, and distribute it in accordance with the license.
