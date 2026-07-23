CommitVerse — 3D Git History Visualizer
A real-time 3D visualization of any Git repository's commit history. Paste a GitHub URL (or a local repo path), watch the codebase grow file-by-file and commit-by-commit in 3D space, then ask the built-in AI assistant anything about what it's showing you.
Built with React 19, React Three Fiber / Three.js, D3 force simulation, Express, and Socket.IO.
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-r183-black)
---
Features
Live 3D commit graph — directories and files animate in as history streams from the server, powered by a 3D force-directed layout (`d3-force-3d`) run in a Web Worker for smooth performance.
Playback controls — pause, resume, scrub, and replay history at 1×–25× speed.
Contributor network view — an alternate graph showing how authors relate through shared files.
Click-to-inspect — click any node to open a modal with that file or directory's commit history.
AI chat panel — ask natural-language questions about the loaded repo ("who are the top contributors?", "which files changed the most?") and get answers grounded in the actual commit data.
Branch and author filtering from the side panel.
Two data modes: clone-and-stream via a local Node server (full history, any public repo or local path), or serverless fetch via the GitHub REST API (good for static/Vercel deployments).
---
Prerequisites
Node.js v18+
Git available on your system `PATH` (required only for the local-server/clone mode)
An OpenRouter API key (for the AI chat panel)
---
Setup
```bash
cd "git visualizer"
npm install
```
Configure the AI chat panel
The backend calls OpenRouter's chat completions API. Don't hardcode the key in `server.js` — use an environment variable instead:
Create a `.env` file in the `git visualizer` directory:
```
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```
Update `server.js` to read it via `process.env.OPENROUTER_API_KEY` (e.g. with `dotenv`), rather than a hardcoded string.
> ⚠️ **Security note:** if you're picking this project up from an earlier version, check `server.js` for a hardcoded `OPENROUTER_API_KEY`. If you find one, revoke that key from your OpenRouter dashboard immediately and switch to the `.env` approach above before pushing to a public repo.
---
Running the Project
Open two terminals from the `git visualizer` directory:
Terminal 1 — Backend (clone + streaming + AI proxy)
```bash
npm run server
```
Expected output: `✅ CommitVerse server → http://localhost:3001`
Terminal 2 — Frontend
```bash
npm run dev
```
Expected output: `➜ Local: http://localhost:5173/`
Then open http://localhost:5173 in your browser.
---
How to Visualize a Repo
Click the URL input at the top of the app.
Pick one of the quick-example repos, or paste your own:
```
   https://github.com/vuejs/vue
   https://github.com/expressjs/express
   https://github.com/facebook/react
   https://github.com/microsoft/vscode
   ```
Press Enter or click ▶ Visualize.
The server clones the repo (shallow, blob-less) and streams its commit history to the browser in real time as it graphs.
> You can also paste a **local absolute path**, e.g. `C:\Users\you\projects\myapp`, as long as it contains a `.git` folder.
---
The 3D Scene
Shape	Meaning
Large translucent glass sphere	Directory node
Small solid colored sphere	File node (color = file type)
Pulsing orbital ring	Node currently being modified
Flowing glowing particles	Changes propagating across the graph
Click any sphere to open a detailed commit history for that file or directory.
---
AI Chat Panel
Toggle it with the 🤖 AI button in the top bar. The assistant (GPT-4o-mini via OpenRouter) is given context on authors, file types, and recent commits, so you can ask things like:
"Who are the top contributors?"
"Which files changed the most?"
"Summarize the project structure"
"What happened in the recent commits?"
---
Controls
Action	How
Rotate camera	Left-click + drag
Zoom	Scroll wheel
Inspect a node	Click any sphere
Pause / resume	⏸ / ▶ in the bottom bar
Change playback speed	`2×` `5×` `10×` `25×`
Load another repo	Paste a new URL → ↺ Replay
Toggle AI panel	`🤖 AI` button (top right)
Toggle contributor network	Network icon in top bar
---
Recommended Repos by Size
Repo	Commits	Clone time	Viz time (25×)
`expressjs/express`	~5,500	~10 sec	~22 sec ✅
`vuejs/vue`	~3,200	~8 sec	~13 sec ✅
`facebook/react`	~16,000	~20 sec	~64 sec ✅
`microsoft/vscode`	~110,000	~2 min	~7 min ⚠️
`torvalds/linux`	~1.1M	~30 min	hours ❌
Start with the smaller repos above to get a feel for the visualization before trying anything huge.
---
Project Structure
```
git visualizer/
├─ server.js                  # Express + Socket.IO backend: clones repos, streams git log, proxies AI chat
├─ src/
│  ├─ App.tsx                 # Top-level layout and view state
│  ├─ components/
│  │  ├─ GourceScene.tsx       # Main 3D scene (nodes, particles, rings)
│  │  ├─ ContributorNetwork.tsx# Alternate contributor-relationship graph
│  │  ├─ AIChatPanel.tsx       # Chat UI for the AI assistant
│  │  ├─ CommitDetailModal.tsx # Per-node commit history modal
│  │  ├─ TopBar.tsx / BottomBar.tsx / LeftPanel.tsx / UIOverlay.tsx
│  ├─ hooks/useGraph.ts        # Core state machine: socket events → graph state
│  ├─ workers/physics.worker.ts# Off-thread d3-force-3d simulation
│  └─ lib/githubApi.ts         # Serverless GitHub REST API data path
└─ package.json
```
---
Troubleshooting
Problem	Fix
Blank canvas	Make sure `npm run server` is running on port 3001
"git clone failed"	Check your internet connection; the repo must be public (or you must have local credentials configured)
"No .git folder found"	Local paths must point to an initialized git repository
AI not responding	Confirm the server is running and `OPENROUTER_API_KEY` is set; check the server terminal for errors
Slow/laggy playback on huge repos	Lower playback speed, or pick a smaller repo — very large histories (100k+ commits) can overwhelm the force simulation
---
License
Add a license of your choice (MIT is a common default for hackathon/demo projects) before publishing this repo publicly.
