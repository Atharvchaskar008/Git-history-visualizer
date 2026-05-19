import { useState } from 'react';
import type { GraphState, CommitInfo } from '../hooks/useGraph';

interface UIOverlayProps {
    state: GraphState;
    onStart: (repoPath: string) => void;
    onPause: () => void;
    onResume: () => void;
    onSpeedChange: (speed: number) => void;
}

function getAvatarColor(email: string): string {
    let hash = 0;
    for (const c of email) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 55%)`;
}

function CommitCard({ commit }: { commit: CommitInfo }) {
    const timeStr = new Date(commit.timestamp * 1000).toLocaleString();
    return (
        <div className="commit-card">
            <div className="commit-avatar" style={{ background: getAvatarColor(commit.email) }}>
                {commit.author.charAt(0).toUpperCase()}
            </div>
            <div className="commit-info">
                <div className="commit-author">{commit.author}</div>
                <div className="commit-hash">{commit.hash.slice(0, 8)}</div>
                <div className="commit-subject">{commit.subject}</div>
                <div className="commit-time">{timeStr}</div>
                <div className="commit-files">
                    {commit.filesChanged.slice(0, 3).map((f, i) => (
                        <span key={i} className={`file-badge file-${f.status === 'A' ? 'added' : f.status === 'D' ? 'deleted' : 'modified'}`}>
                            {f.status} {f.path.split('/').pop()}
                        </span>
                    ))}
                    {commit.filesChanged.length > 3 && (
                        <span className="file-badge file-more">+{commit.filesChanged.length - 3} more</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatsBar({ state }: { state: GraphState }) {
    const nodeCount = state.nodes.size;
    const edgeCount = state.edges.length;
    const latestCommit = state.recentCommits[0];

    return (
        <div className="stats-bar">
            <div className="stat-item">
                <span className="stat-value">{nodeCount}</span>
                <span className="stat-label">Files</span>
            </div>
            <div className="stat-item">
                <span className="stat-value">{edgeCount}</span>
                <span className="stat-label">Edges</span>
            </div>
            <div className="stat-item">
                <span className="stat-value">{state.recentCommits.length}</span>
                <span className="stat-label">Commits</span>
            </div>
            {latestCommit && (
                <div className="stat-item">
                    <span className="stat-value" style={{ fontSize: '0.65rem', color: '#f59e0b' }}>
                        {latestCommit.author}
                    </span>
                    <span className="stat-label">Latest Author</span>
                </div>
            )}
        </div>
    );
}

export function UIOverlay({ state, onStart, onPause, onResume, onSpeedChange }: UIOverlayProps) {
    const [repoPath, setRepoPath] = useState('');
    const [started, setStarted] = useState(false);

    function handleStart() {
        if (!repoPath.trim()) return;
        setStarted(true);
        onStart(repoPath.trim());
    }

    return (
        <div className="ui-overlay">
            {/* Header */}
            <div className="header-bar">
                <div className="logo">
                    <span className="logo-icon">⬡</span>
                    <span className="logo-text">GOURCE<span className="logo-accent">3D</span></span>
                </div>
                {started && <StatsBar state={state} />}
                <div className="header-badge">LIVE</div>
            </div>

            {/* Repo Input */}
            {!started && (
                <div className="repo-input-panel">
                    <h2 className="panel-title">3D Git History Visualizer</h2>
                    <p className="panel-sub">Enter an absolute path to a local git repository</p>
                    <div className="input-row">
                        <input
                            className="repo-input"
                            type="text"
                            placeholder="C:\path\to\your\repo  or  /home/user/project"
                            value={repoPath}
                            onChange={(e) => setRepoPath(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        />
                        <button className="btn-primary" onClick={handleStart}>
                            Visualize →
                        </button>
                    </div>
                </div>
            )}

            {/* Playback Controls */}
            {started && (
                <div className="controls-bar">
                    {state.isPlaying ? (
                        <button className="btn-control" onClick={onPause} title="Pause">⏸</button>
                    ) : (
                        <button className="btn-control btn-play" onClick={onResume} title="Play">▶</button>
                    )}
                    <span className="speed-label">Speed</span>
                    {[1, 2, 5, 10].map((s) => (
                        <button
                            key={s}
                            className={`btn-speed ${state.speed === s ? 'active' : ''}`}
                            onClick={() => onSpeedChange(s)}
                        >
                            {s}×
                        </button>
                    ))}
                    {state.isDone && <span className="done-badge">✓ Done</span>}
                </div>
            )}

            {/* Commit Feed */}
            {started && state.recentCommits.length > 0 && (
                <div className="commit-feed">
                    <div className="feed-header">Recent Commits</div>
                    <div className="feed-list">
                        {state.recentCommits.slice(0, 8).map((c) => (
                            <CommitCard key={c.hash} commit={c} />
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="legend">
                <div className="legend-item"><span className="dot" style={{ background: '#22c55e' }} />Added</div>
                <div className="legend-item"><span className="dot" style={{ background: '#f59e0b' }} />Modified</div>
                <div className="legend-item"><span className="dot" style={{ background: '#ef4444' }} />Deleted</div>
                <div className="legend-item"><span className="dot" style={{ background: '#334155' }} />Directory</div>
            </div>
        </div>
    );
}
