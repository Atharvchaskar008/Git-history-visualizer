# Gource3D — 3D Git History Visualizer

A real-time **3D visualization** of any Git repository's commit history. Paste a GitHub URL, watch your codebase unfold in 3D space, then ask the built-in **AI** anything about the repo.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/) (must be in your system PATH)

---

## Setup

```bash
# Only needed once
cd "Bluebit 4.0 hackathon"
npm install
```

---

## Running the Project

Open **two terminals**:

**Terminal 1 — Backend**
```bash
node server.js
```
Expected: `✅ Gource3D server → http://localhost:3001`

**Terminal 2 — Frontend**
```bash
npm run dev
```
Expected: `➜ Local: http://localhost:5173/`

Then open **http://localhost:5173** in your browser.

---

## How to Visualize a Repo

1. Click the URL input at the top
2. A **quick-examples dropdown** appears — pick one, or paste your own URL:
   ```
   https://github.com/vuejs/vue
   https://github.com/expressjs/express
   https://github.com/facebook/react
   https://github.com/microsoft/vscode
   ```
3. Press **Enter** or click **▶ Visualize**
4. The server clones the repo and streams commit history in real time

> You can also paste a **local absolute path** e.g. `C:\Users\you\projects\myapp`

---

## 3D Scene

| Shape | Meaning |
|-------|---------|
| Large translucent **glass sphere** | Directory node |
| Small solid colored **sphere** | File node (color = file type) |
| Pulsing **orbital ring** | Currently active / being modified |
| Flowing **glowing particles** | Data moving across the graph |

**Click any sphere** to open a detailed commit history for that file or directory.

---

## AI Chat Panel

Toggle with the **🤖 AI ▸** button in the top bar.

Ask anything about the loaded repo:
- *"Who are the top contributors?"*
- *"Which files changed the most?"*
- *"Summarize the project structure"*
- *"What happened in the recent commits?"*

The AI (GPT-4o-mini via OpenRouter) receives full repo context — authors, file types, and the last 20 commits.

---

## Controls

| Action | How |
|--------|-----|
| Rotate | Left-click + drag |
| Zoom | Scroll wheel |
| Inspect a node | Click any sphere |
| Pause / Resume | ⏸ / ▶ in bottom bar |
| Speed up history | `2×` `5×` `10×` `25×` |
| Try another repo | Paste new URL → **↺ Replay** |
| Toggle AI panel | `🤖 AI ▸` button (top right) |

---

## Recommended Repos by Size

| Repo | Commits | Clone | Viz at 25× |
|------|---------|-------|------------|
| `expressjs/express` | ~5,500 | ~10 sec | ~22 sec ✅ |
| `vuejs/vue` | ~3,200 | ~8 sec | ~13 sec ✅ |
| `facebook/react` | ~16,000 | ~20 sec | ~64 sec ✅ |
| `microsoft/vscode` | ~110,000 | ~2 min | ~7 min ⚠️ |
| `torvalds/linux` | ~1.1M | ~30 min | hours ❌ |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank canvas | Make sure `node server.js` is running on port 3001 |
| "git clone failed" | Check internet connection; repo must be public |
| "No .git folder" | Local paths must point to an initialized git repository |
| AI not responding | Server must be running; check terminal for errors |
