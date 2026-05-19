import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const OPENROUTER_API_KEY = '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';

// ─── OpenRouter AI Chat Endpoint ─────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { question, context } = req.body;
    if (!question) return res.status(400).json({ error: 'No question provided' });

    const systemPrompt = `You are a Git repository analyst AI. You have been given context about a repository's commit history, file structure, and contributors. Answer questions concisely and directly. When showing commit hashes, show only the first 7 characters. Format key info with markdown. If you reference file paths, use code formatting.

Repository context:
${context ?? 'No repository loaded yet.'}`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Gource3D Git Visualizer',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question },
                ],
                max_tokens: 600,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(500).json({ error: `OpenRouter error: ${err}` });
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content ?? 'No response from AI.';
        res.json({ answer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Git helpers ──────────────────────────────────────────────────────────────
function isGitUrl(input) {
    return /^https?:\/\//i.test(input) || /^git@/i.test(input) || /^github\.com\//i.test(input);
}

function normalizeUrl(input) {
    if (/^github\.com\//i.test(input)) return `https://${input}`;
    if (/^git@github\.com:/.test(input)) return input.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
    return input;
}

function cloneRepo(url, socket) {
    return new Promise((resolve, reject) => {
        const tmpDir = path.join(os.tmpdir(), `gource3d_${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });
        socket.emit('status', { message: `⏳ Cloning ${url} — please wait…` });
        const clone = spawn('git', ['clone', '--filter=blob:none', '--no-checkout', url, tmpDir]);
        clone.stderr.on('data', (d) => { const m = d.toString().trim(); if (m) socket.emit('status', { message: m }); });
        clone.on('close', (code) => {
            if (code === 0) { socket.emit('status', { message: '✅ Clone complete — streaming history…' }); resolve(tmpDir); }
            else { fs.rmSync(tmpDir, { recursive: true, force: true }); reject(new Error(`git clone exited ${code}`)); }
        });
    });
}

function streamGitLog(repoPath, socket) {
    let buffer = '';
    let currentCommit = null;
    const gitLog = spawn('git', ['-C', repoPath, 'log', '--pretty=format:COMMIT|%at|%an|%ae|%H|%s', '--name-status', '--reverse', '--diff-filter=ACDMRT']);

    gitLog.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            const t = line.trim();
            if (!t) { if (currentCommit) { socket.emit('commit', currentCommit); currentCommit = null; } continue; }
            if (t.startsWith('COMMIT|')) {
                if (currentCommit) socket.emit('commit', currentCommit);
                const p = t.split('|');
                currentCommit = { timestamp: parseInt(p[1], 10), author: p[2], email: p[3], hash: p[4], subject: p.slice(5).join('|'), files: [] };
            } else if (currentCommit) {
                const ti = t.indexOf('\t');
                if (ti !== -1) {
                    const status = t.slice(0, ti).charAt(0);
                    const rest = t.slice(ti + 1);
                    const filePath = rest.includes('\t') ? rest.split('\t')[1] : rest;
                    if (filePath) currentCommit.files.push({ status, path: filePath });
                }
            }
        }
    });

    gitLog.on('close', () => { if (currentCommit) socket.emit('commit', currentCommit); socket.emit('done'); });
    gitLog.stderr.on('data', (d) => console.error('git log stderr:', d.toString().trim()));
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let tempDir = null;

    socket.on('start', async ({ repoPath }) => {
        const input = (repoPath ?? '').trim();
        if (!input) { socket.emit('error', { message: 'Please provide a GitHub URL or local path.' }); return; }
        try {
            let resolvedPath;
            if (isGitUrl(input)) {
                resolvedPath = await cloneRepo(normalizeUrl(input), socket);
                tempDir = resolvedPath;
            } else {
                resolvedPath = path.resolve(input);
                if (!fs.existsSync(path.join(resolvedPath, '.git'))) {
                    socket.emit('error', { message: `No .git folder found at: ${resolvedPath}` }); return;
                }
            }
            console.log('Streaming git log for:', resolvedPath);
            streamGitLog(resolvedPath, socket);
        } catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);
        if (tempDir) { fs.rm(tempDir, { recursive: true, force: true }, () => { }); tempDir = null; }
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => console.log(`\n✅ Gource3D server → http://localhost:${PORT}\n`));
