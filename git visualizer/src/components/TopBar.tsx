import { useState } from 'react';
import type { GraphState } from '../hooks/useGraph';

interface TopBarProps {
    state: GraphState;
    onStart: (input: string) => void;
    onToggleAI: () => void;
    aiOpen: boolean;
    onToggleNetwork: () => void;
    networkOpen: boolean;
}

const EXAMPLES = [
    { label: 'vuejs/vue', url: 'https://github.com/vuejs/vue' },
    { label: 'expressjs/express', url: 'https://github.com/expressjs/express' },
    { label: 'facebook/react', url: 'https://github.com/facebook/react' },
    { label: 'vercel/next.js', url: 'https://github.com/vercel/next.js' },
    { label: 'microsoft/vscode', url: 'https://github.com/microsoft/vscode' },
];

export function TopBar({ state, onStart, onToggleAI, aiOpen, onToggleNetwork, networkOpen }: TopBarProps) {
    const [input, setInput] = useState('');
    const [showExamples, setShowExamples] = useState(false);

    function handleStart(value?: string) {
        const v = (value ?? input).trim();
        if (!v) return;
        setInput(v);
        setShowExamples(false);
        onStart(v);
    }

    const nodeCount = state.nodes.size;
    const commitCount = state.totalCommits;
    const latestAuthor = state.recentCommits[0]?.author;
    const isBusy = (state.isPlaying && !state.isDone) || state.fetchPhase === 'fetching' || state.fetchPhase === 'parsing';

    return (
        <header className="top-bar">
            {/* Brand */}
            <div className="brand">
                <span className="brand-hex brand-icon">⎇</span>
                <div className="brand-text">
                    <span className="brand-name">Git History <span className="brand-accent">Visualizer</span></span>
                    <span className="brand-tagline">Interactive 3D repository explorer</span>
                </div>
            </div>

            {/* Input */}
            <div className="repo-form">
                <div className={`repo-input-wrap ${state.statusMessage.startsWith('❌') ? 'has-error' : ''}`}>
                    <span className="input-icon">🔗</span>
                    <input
                        className="repo-input"
                        type="text"
                        placeholder="https://github.com/user/repo"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        onFocus={() => setShowExamples(true)}
                        onBlur={() => setTimeout(() => setShowExamples(false), 200)}
                    />
                </div>
                <button className={`btn-visualize ${isBusy ? 'btn-streaming' : ''}`} onClick={() => handleStart()} disabled={isBusy}>
                    {isBusy ? '⏺ Running…' : state.isDone ? '↺ Replay' : '▶ Visualize'}
                </button>

                {/* Dropdown */}
                {showExamples && !isBusy && (
                    <div className="examples-dropdown">
                        <div className="examples-title">Quick examples</div>
                        {EXAMPLES.map((ex) => (
                            <button key={ex.url} className="example-item" onMouseDown={() => handleStart(ex.url)}>
                                <span className="example-icon">⬡</span>
                                <span className="example-label">{ex.label}</span>
                                <span className="example-url">{ex.url}</span>
                            </button>
                        ))}
                        <div className="examples-hint">or paste any GitHub repository URL</div>
                    </div>
                )}
            </div>

            {/* Status / Stats */}
            {state.statusMessage ? (
                <span className={`status-msg ${state.statusMessage.startsWith('❌') ? 'status-error' : 'status-info'}`}>
                    {state.statusMessage}
                </span>
            ) : (
                <div className="topbar-stats">
                    {nodeCount > 0 && <>
                        <div className="ts-item"><span className="ts-val">{nodeCount.toLocaleString()}</span><span className="ts-label">nodes</span></div>
                        <div className="ts-sep" />
                        <div className="ts-item"><span className="ts-val">{commitCount.toLocaleString()}</span><span className="ts-label">commits</span></div>
                    </>}
                    {latestAuthor && <><div className="ts-sep" /><div className="ts-item"><span className="ts-val ts-author">{latestAuthor}</span><span className="ts-label">latest author</span></div></>}
                    {state.isDone && nodeCount > 0 && <span className="done-pill">✓ Done</span>}
                </div>
            )}

            {/* Network Toggle */}
            <button className={`ai-toggle-btn ${networkOpen ? 'ai-toggle-active' : ''}`} onClick={onToggleNetwork} title="Toggle Contributor Network">
                <span className="ai-toggle-icon">🌐</span> Network {networkOpen ? '▸' : '◂'}
            </button>

            {/* AI Toggle */}
            <button className={`ai-toggle-btn ${aiOpen ? 'ai-toggle-active' : ''}`} onClick={onToggleAI} title="Toggle AI Chat">
                <span className="ai-toggle-icon">✦</span> AI {aiOpen ? '▸' : '◂'}
            </button>
        </header>
    );
}
