import { useState, useRef, useEffect, useMemo } from 'react';
import type { GraphState } from '../hooks/useGraph';

interface AIChatPanelProps {
    state: GraphState;
}

interface Message {
    role: 'user' | 'ai';
    content: string;
    ts: number;
}

const SUGGESTED = [
    'Who are the top contributors?',
    'Which files are changed the most?',
    'What are the most recent commits?',
    'Summarize the project structure',
    'Which commit added the most files?',
    'What file types exist in this repo?',
];

function buildContext(state: GraphState): string {
    const { nodes, recentCommits } = state;
    const fileCount = Array.from(nodes.values()).filter(n => n.type === 'file').length;
    const dirCount = Array.from(nodes.values()).filter(n => n.type === 'dir').length;

    // Author stats
    const authorMap: Record<string, number> = {};
    for (const c of recentCommits) {
        authorMap[c.author] = (authorMap[c.author] ?? 0) + 1;
    }
    const topAuthors = Object.entries(authorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `${name} (${count} commits)`)
        .join(', ');

    // Extension stats
    const extMap: Record<string, number> = {};
    for (const [, n] of nodes) {
        if (n.type === 'file') extMap[n.ext] = (extMap[n.ext] ?? 0) + 1;
    }
    const topExts = Object.entries(extMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([ext, count]) => `.${ext}: ${count}`)
        .join(', ');

    // Recent 20 commits
    const commitList = recentCommits.slice(0, 20).map((c) =>
        `- [${c.hash.slice(0, 7)}] ${c.author}: "${c.subject}" (${c.filesChanged.length} files, ${new Date(c.timestamp * 1000).toLocaleDateString()})`
    ).join('\n');

    return `Files: ${fileCount}, Directories: ${dirCount}, Total commits loaded: ${recentCommits.length}
Top contributors: ${topAuthors || 'None yet'}
File types: ${topExts || 'None yet'}
Recent commits:
${commitList || 'None loaded yet'}`;
}

export function AIChatPanel({ state }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const context = useMemo(() => buildContext(state), [state.recentCommits.length, state.nodes.size]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage(question: string) {
        if (!question.trim() || loading) return;
        const userMsg: Message = { role: 'user', content: question, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, context }),
            });
            const data = await res.json();
            const aiMsg: Message = { role: 'ai', content: data.answer ?? data.error ?? 'No response', ts: Date.now() };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: 'ai', content: '❌ Failed to reach AI service. Make sure the server is running.', ts: Date.now() }]);
        } finally {
            setLoading(false);
        }
    }

    const hasData = state.nodes.size > 0;

    return (
        <aside className="ai-panel">
            {/* Header */}
            <div className="ai-header">
                <div className="ai-header-icon ai-icon-spark">✦</div>
                <div>
                    <div className="ai-header-title">Repo Intelligence</div>
                    <div className="ai-header-sub">Ask anything about this repository</div>
                </div>
                <div className={`ai-status-dot ${hasData ? 'ai-dot-ready' : 'ai-dot-idle'}`} title={hasData ? 'Ready' : 'Load a repo first'} />
            </div>

            {/* Chat log */}
            <div className="ai-chat-log">
                {messages.length === 0 && (
                    <div className="ai-empty">
                        <div className="ai-empty-icon">💬</div>
                        <p>{hasData ? 'Ask me anything about this repository.' : 'Visualize a repo first, then ask questions.'}</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
                        <div className={`ai-msg-avatar ${msg.role === 'ai' ? 'ai-avatar-ai' : 'ai-avatar-user'}`}>{msg.role === 'user' ? '⬡' : '✦'}</div>
                        <div className="ai-msg-bubble">
                            <pre className="ai-msg-content">{msg.content}</pre>
                            <div className="ai-msg-time">{new Date(msg.ts).toLocaleTimeString()}</div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="ai-msg ai-msg-ai">
                        <div className="ai-msg-avatar ai-avatar-ai">✦</div>
                        <div className="ai-msg-bubble ai-thinking">
                            <div className="ai-dots"><span /><span /><span /></div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggested chips */}
            {!loading && messages.length < 2 && hasData && (
                <div className="ai-suggestions">
                    <div className="ai-suggestions-title">Try asking:</div>
                    <div className="ai-chips">
                        {SUGGESTED.map((q) => (
                            <button key={q} className="ai-chip" onClick={() => sendMessage(q)}>{q}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="ai-input-row">
                <input
                    className="ai-input"
                    type="text"
                    placeholder={hasData ? 'Ask about commits, authors, files…' : 'Load a repo to enable AI…'}
                    value={input}
                    disabled={!hasData || loading}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                />
                <button className="ai-send-btn" onClick={() => sendMessage(input)} disabled={!hasData || loading || !input.trim()}>
                    {loading ? '◌' : '↑'}
                </button>
            </div>
        </aside>
    );
}
