import { useRef, useEffect, useState, useCallback } from 'react';
import {
  parseGitHubUrl,
  fetchCommits,
  fetchBranches,
  computeAnalytics,
  type GitHubCommit,
  type FetchProgress,
  type RepoAnalytics,
} from '../lib/githubApi';

export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'dir';
    ext: string;
    parent?: string;
    position: [number, number, number];
    color: string;
    lastActivity: 'added' | 'modified' | 'deleted' | null;
    activityAge: number;
    churn: number;
}

export interface Edge { source: string; target: string; }

export interface CommitInfo {
    hash: string;
    author: string;
    email: string;
    timestamp: number;
    subject: string;
    filesChanged: { status: string; path: string }[];
    branch?: string;
}

export interface GraphState {
    nodes: Map<string, FileNode>;
    edges: Edge[];
    positions: Record<string, [number, number, number]>;
    recentCommits: CommitInfo[];
    allCommits: CommitInfo[];
    isPlaying: boolean;
    speed: number;
    isDone: boolean;
    activeNodes: Set<string>;
    statusMessage: string;
    // New features
    currentCommitIndex: number;
    totalCommits: number;
    branches: string[];
    selectedBranch: string;
    selectedAuthor: string;
    analytics: RepoAnalytics | null;
    repoOwner: string;
    repoName: string;
    fetchPhase: FetchProgress['phase'] | 'idle';
}

const EXT_COLORS: Record<string, string> = {
    ts: '#3b82f6', tsx: '#60a5fa', js: '#f59e0b', jsx: '#fbbf24',
    py: '#22c55e', rs: '#f97316', go: '#06b6d4', java: '#ef4444',
    css: '#a855f7', scss: '#d946ef', html: '#fb923c', md: '#94a3b8',
    json: '#facc15', yml: '#34d399', yaml: '#34d399', sh: '#86efac',
    c: '#555555', cpp: '#f34b7d', h: '#0078d4', rb: '#dc143c',
    php: '#4F5D95', swift: '#FA7343', kt: '#F18E33', vue: '#42b883',
    svelte: '#ff3e00', dart: '#00B4AB',
    default: '#64748b',
};

function getColor(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? 'default';
    return EXT_COLORS[ext] ?? EXT_COLORS.default;
}

function ensureDirNodes(
    filePath: string,
    nodes: Map<string, FileNode>,
    newNodes: Array<{ id: string }>,
    newLinks: Array<{ source: string; target: string }>
) {
    const parts = filePath.split('/');
    let accumulated = '';
    for (let i = 0; i < parts.length - 1; i++) {
        const parent = accumulated;
        accumulated = accumulated ? `${accumulated}/${parts[i]}` : parts[i];
        if (!nodes.has(accumulated)) {
            nodes.set(accumulated, {
                id: accumulated, name: parts[i], type: 'dir', ext: 'dir',
                parent: parent || undefined, position: [0, 0, 0],
                color: '#334155', lastActivity: null, activityAge: 9999,
                churn: 0,
            });
            newNodes.push({ id: accumulated });
            if (parent) newLinks.push({ source: parent, target: accumulated });
        }
    }
    return accumulated;
}

export function useGraph() {
    const [state, setState] = useState<GraphState>({
        nodes: new Map(), edges: [], positions: {}, recentCommits: [],
        allCommits: [],
        isPlaying: false, speed: 1, isDone: false, activeNodes: new Set(),
        statusMessage: '',
        currentCommitIndex: 0,
        totalCommits: 0,
        branches: [],
        selectedBranch: 'main',
        selectedAuthor: '',
        analytics: null,
        repoOwner: '',
        repoName: '',
        fetchPhase: 'idle',
    });

    const workerRef = useRef<Worker | null>(null);
    const queueRef = useRef<CommitInfo[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stateRef = useRef(state);
    stateRef.current = state;
    const commitIndexRef = useRef(0);

    // Create physics worker on mount
    useEffect(() => {
        const worker = new Worker(
            new URL('../workers/physics.worker.ts', import.meta.url),
            { type: 'module' }
        );
        workerRef.current = worker;
        worker.onmessage = (e) => {
            if (e.data.type === 'tick') {
                setState((prev) => ({ ...prev, positions: { ...e.data.positions } }));
            }
        };

        return () => {
            worker.terminate();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const processNextCommit = useCallback(() => {
        const queue = queueRef.current;
        if (queue.length === 0) {
            // All commits processed
            setState((prev) => {
                if (prev.isPlaying && prev.currentCommitIndex >= prev.totalCommits) {
                    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
                    return { ...prev, isPlaying: false, isDone: true };
                }
                return prev;
            });
            return;
        }
        const commit = queue.shift()!;
        commitIndexRef.current++;
        const currentState = stateRef.current;
        const nodes = new Map(currentState.nodes);
        const newNodes: Array<{ id: string }> = [];
        const newLinks: Array<{ source: string; target: string }> = [];
        const activeNodes = new Set<string>();
        const churnMap = currentState.analytics?.fileChurnMap;

        for (const { status, path: filePath } of commit.filesChanged) {
            const normPath = filePath.replace(/\\/g, '/');
            const parentDirId = ensureDirNodes(normPath, nodes, newNodes, newLinks);
            const fileChurn = churnMap?.get(normPath) ?? 0;

            if (!nodes.has(normPath)) {
                nodes.set(normPath, {
                    id: normPath,
                    name: normPath.split('/').pop() ?? normPath,
                    type: 'file',
                    ext: normPath.split('.').pop()?.toLowerCase() ?? 'default',
                    parent: parentDirId || undefined,
                    position: [0, 0, 0],
                    color: getColor(normPath),
                    lastActivity: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
                    activityAge: 0,
                    churn: fileChurn,
                });
                newNodes.push({ id: normPath });
                if (parentDirId) newLinks.push({ source: parentDirId, target: normPath });
            } else {
                const ex = nodes.get(normPath)!;
                nodes.set(normPath, {
                    ...ex,
                    lastActivity: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
                    activityAge: 0,
                    churn: fileChurn,
                });
            }
            activeNodes.add(normPath);
        }

        if (newNodes.length > 0) {
            workerRef.current?.postMessage({ type: 'addNodes', payload: { nodes: newNodes, links: newLinks } });
        }

        setState((prev) => ({
            ...prev,
            nodes,
            edges: [...prev.edges, ...newLinks],
            recentCommits: [commit, ...prev.recentCommits].slice(0, 500),
            activeNodes,
            currentCommitIndex: commitIndexRef.current,
        }));
    }, []);

    const start = useCallback(async (repoInput: string) => {
        // Stop any running interval
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

        // Parse GitHub URL
        const parsed = parseGitHubUrl(repoInput);
        if (!parsed) {
            setState((prev) => ({
                ...prev,
                statusMessage: '❌ Please enter a valid GitHub URL (e.g., https://github.com/vuejs/vue)',
                fetchPhase: 'error',
            }));
            return;
        }

        // Reset worker physics
        workerRef.current?.postMessage({ type: 'reset' });
        queueRef.current = [];
        commitIndexRef.current = 0;

        // Clear all state
        setState({
            nodes: new Map(), edges: [], positions: {}, recentCommits: [],
            allCommits: [],
            isPlaying: false, speed: 1, isDone: false, activeNodes: new Set(),
            statusMessage: '⏳ Connecting to GitHub API…',
            currentCommitIndex: 0,
            totalCommits: 0,
            branches: [],
            selectedBranch: 'main',
            selectedAuthor: '',
            analytics: null,
            repoOwner: parsed.owner,
            repoName: parsed.repo,
            fetchPhase: 'fetching',
        });

        // Fetch branches
        const branches = await fetchBranches(parsed.owner, parsed.repo);
        setState((prev) => ({ ...prev, branches, selectedBranch: branches[0] || 'main' }));

        // Fetch commits
        const commits = await fetchCommits(parsed.owner, parsed.repo, {
            branch: branches[0] || 'main',
            maxCommits: 500,
            onProgress: (p) => {
                setState((prev) => ({
                    ...prev,
                    statusMessage: p.message,
                    fetchPhase: p.phase,
                }));
            },
        });

        if (commits.length === 0) {
            setState((prev) => ({
                ...prev,
                statusMessage: '❌ No commits found. Check the repository URL.',
                fetchPhase: 'error',
            }));
            return;
        }

        // Compute analytics
        const analytics = computeAnalytics(commits);

        // Convert to CommitInfo
        const commitInfos: CommitInfo[] = commits.map((c) => ({
            hash: c.hash,
            author: c.author,
            email: c.email,
            timestamp: c.timestamp,
            subject: c.subject,
            filesChanged: c.filesChanged,
            branch: c.branch,
        }));

        // Queue them for playback
        queueRef.current = [...commitInfos];

        setState((prev) => ({
            ...prev,
            allCommits: commitInfos,
            totalCommits: commitInfos.length,
            analytics,
            isPlaying: true,
            statusMessage: '',
            fetchPhase: 'done',
        }));

        // Start processing queue
        intervalRef.current = setInterval(() => {
            const speed = stateRef.current.speed;
            for (let i = 0; i < speed; i++) processNextCommit();
        }, 100);
    }, [processNextCommit]);

    const pause = useCallback(() => {
        setState((prev) => ({ ...prev, isPlaying: false }));
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }, []);

    const resume = useCallback(() => {
        if (intervalRef.current) return;
        setState((prev) => ({ ...prev, isPlaying: true }));
        intervalRef.current = setInterval(() => {
            const speed = stateRef.current.speed;
            for (let i = 0; i < speed; i++) processNextCommit();
        }, 100);
    }, [processNextCommit]);

    const setSpeed = useCallback((speed: number) => {
        setState((prev) => ({ ...prev, speed }));
    }, []);

    const seekTo = useCallback((commitIndex: number) => {
        // Stop playback
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

        // Reset physics
        workerRef.current?.postMessage({ type: 'reset' });

        const allCommits = stateRef.current.allCommits;
        const analytics = stateRef.current.analytics;
        const slicedCommits = allCommits.slice(0, commitIndex);

        // Rebuild state up to the seek point
        const nodes = new Map<string, FileNode>();
        const edges: Edge[] = [];
        const allNewNodes: Array<{ id: string }> = [];
        const allNewLinks: Array<{ source: string; target: string }> = [];

        for (const commit of slicedCommits) {
            const activeNodes = new Set<string>();
            for (const { status, path: filePath } of commit.filesChanged) {
                const normPath = filePath.replace(/\\/g, '/');
                const parentDirId = ensureDirNodes(normPath, nodes, allNewNodes, allNewLinks);
                const fileChurn = analytics?.fileChurnMap?.get(normPath) ?? 0;

                if (!nodes.has(normPath)) {
                    nodes.set(normPath, {
                        id: normPath,
                        name: normPath.split('/').pop() ?? normPath,
                        type: 'file',
                        ext: normPath.split('.').pop()?.toLowerCase() ?? 'default',
                        parent: parentDirId || undefined,
                        position: [0, 0, 0],
                        color: getColor(normPath),
                        lastActivity: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
                        activityAge: 0,
                        churn: fileChurn,
                    });
                    if (parentDirId) allNewLinks.push({ source: parentDirId, target: normPath });
                } else {
                    const ex = nodes.get(normPath)!;
                    nodes.set(normPath, {
                        ...ex,
                        lastActivity: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
                        activityAge: 0,
                        churn: fileChurn,
                    });
                }
                activeNodes.add(normPath);
            }
        }

        // Send all nodes to physics worker at once
        if (allNewNodes.length > 0) {
            workerRef.current?.postMessage({
                type: 'addNodes',
                payload: { nodes: allNewNodes, links: allNewLinks },
            });
        }

        // Rebuild remaining queue
        queueRef.current = allCommits.slice(commitIndex).map((c) => ({ ...c }));
        commitIndexRef.current = commitIndex;

        const lastCommit = slicedCommits[slicedCommits.length - 1];
        setState((prev) => ({
            ...prev,
            nodes,
            edges: allNewLinks,
            recentCommits: slicedCommits.slice(-500).reverse(),
            currentCommitIndex: commitIndex,
            isPlaying: false,
            isDone: commitIndex >= allCommits.length,
            activeNodes: new Set(),
            statusMessage: lastCommit
                ? `⏩ Jumped to commit ${commitIndex}/${prev.totalCommits}`
                : '',
        }));
    }, []);

    const setSelectedAuthor = useCallback((author: string) => {
        setState((prev) => ({ ...prev, selectedAuthor: author }));
    }, []);

    const changeBranch = useCallback(async (branch: string) => {
        const { repoOwner, repoName } = stateRef.current;
        if (!repoOwner || !repoName) return;

        // Stop playback
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        workerRef.current?.postMessage({ type: 'reset' });
        queueRef.current = [];
        commitIndexRef.current = 0;

        setState((prev) => ({
            ...prev,
            nodes: new Map(), edges: [], positions: {}, recentCommits: [],
            allCommits: [],
            isPlaying: false, isDone: false, activeNodes: new Set(),
            statusMessage: `⏳ Switching to branch: ${branch}...`,
            currentCommitIndex: 0,
            totalCommits: 0,
            selectedBranch: branch,
            analytics: null,
            fetchPhase: 'fetching',
        }));

        const commits = await fetchCommits(repoOwner, repoName, {
            branch,
            maxCommits: 500,
            onProgress: (p) => {
                setState((prev) => ({
                    ...prev,
                    statusMessage: p.message,
                    fetchPhase: p.phase,
                }));
            },
        });

        const analytics = computeAnalytics(commits);
        const commitInfos: CommitInfo[] = commits.map((c) => ({
            hash: c.hash, author: c.author, email: c.email,
            timestamp: c.timestamp, subject: c.subject,
            filesChanged: c.filesChanged, branch: c.branch,
        }));

        queueRef.current = [...commitInfos];
        setState((prev) => ({
            ...prev,
            allCommits: commitInfos,
            totalCommits: commitInfos.length,
            analytics,
            isPlaying: true,
            statusMessage: '',
            fetchPhase: 'done',
        }));

        intervalRef.current = setInterval(() => {
            const speed = stateRef.current.speed;
            for (let i = 0; i < speed; i++) processNextCommit();
        }, 100);
    }, [processNextCommit]);

    return {
        state, start, pause, resume, setSpeed,
        seekTo, setSelectedAuthor, changeBranch,
    };
}
