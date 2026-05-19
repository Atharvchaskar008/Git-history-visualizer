import { useMemo } from 'react';
import type { GraphState } from '../hooks/useGraph';

interface LeftPanelProps {
    state: GraphState;
}

// ---- Extension colors (must match GourceScene) ----
const EXT_COLORS: Record<string, string> = {
    ts: '#3b82f6', tsx: '#60a5fa', js: '#f59e0b', jsx: '#fbbf24',
    py: '#22c55e', rs: '#f97316', go: '#06b6d4', java: '#ef4444',
    css: '#a855f7', scss: '#d946ef', html: '#fb923c', md: '#94a3b8',
    json: '#facc15', yml: '#34d399', yaml: '#34d399', sh: '#86efac',
    default: '#64748b',
};

function getColor(path: string): string {
    const ext = path.split('.').pop() ?? 'default';
    return EXT_COLORS[ext] ?? EXT_COLORS.default;
}

// ---- Author Avatar ----
function getAvatarColor(email: string): string {
    let hash = 0;
    for (const c of email) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

// ---- File Type Chart (SVG donut) ----
function FileTypeChart({ nodes }: { nodes: GraphState['nodes'] }) {
    const slices = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const [, n] of nodes) {
            if (n.type !== 'file') continue;
            const ext = n.ext || 'other';
            counts[ext] = (counts[ext] ?? 0) + 1;
        }
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) return [];

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        let cumAngle = -90;
        return sorted.map(([ext, count]) => {
            const deg = (count / total) * 360;
            const start = cumAngle;
            cumAngle += deg;
            const color = EXT_COLORS[ext] ?? EXT_COLORS.default;
            return { ext, count, deg, start, color, pct: Math.round((count / total) * 100) };
        });
    }, [nodes]);

    if (slices.length === 0) return null;

    const r = 38;
    const cx = 50;
    const cy = 50;
    const strokeW = 14;
    const circ = 2 * Math.PI * r;

    return (
        <div className="chart-section">
            <div className="section-title">File Types</div>
            <div className="chart-row">
                <svg viewBox="0 0 100 100" width="90" height="90">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeW} />
                    {slices.map((s, i) => {
                        const dashArray = (s.deg / 360) * circ;
                        const dashOffset = circ - ((s.start + 90) / 360) * circ;
                        return (
                            <circle
                                key={i}
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={strokeW}
                                strokeDasharray={`${dashArray} ${circ}`}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'all 0.5s' }}
                            />
                        );
                    })}
                    <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="700">
                        {slices.reduce((a, s) => a + s.count, 0)}
                    </text>
                    <text x={cx} y={cy + 8} textAnchor="middle" fill="#64748b" fontSize="5.5">
                        files
                    </text>
                </svg>
                <div className="legend-list">
                    {slices.slice(0, 6).map((s) => (
                        <div key={s.ext} className="legend-row">
                            <span className="legend-dot" style={{ background: s.color }} />
                            <span className="legend-ext">.{s.ext}</span>
                            <span className="legend-pct">{s.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ---- Author Leaderboard ----
function AuthorLeaderboard({ commits }: { commits: GraphState['recentCommits'] }) {
    const authors = useMemo(() => {
        const map: Record<string, { name: string; email: string; commits: number; files: number }> = {};
        for (const c of commits) {
            if (!map[c.email]) map[c.email] = { name: c.author, email: c.email, commits: 0, files: 0 };
            map[c.email].commits++;
            map[c.email].files += c.filesChanged.length;
        }
        return Object.values(map).sort((a, b) => b.commits - a.commits).slice(0, 6);
    }, [commits]);

    if (authors.length === 0) return null;

    const maxCommits = authors[0]?.commits ?? 1;

    return (
        <div className="chart-section">
            <div className="section-title">Top Contributors</div>
            {authors.map((a) => (
                <div key={a.email} className="author-row">
                    <div className="author-avatar" style={{ background: getAvatarColor(a.email) }}>
                        {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-details">
                        <div className="author-name">{a.name}</div>
                        <div className="author-bar-track">
                            <div
                                className="author-bar-fill"
                                style={{
                                    width: `${(a.commits / maxCommits) * 100}%`,
                                    background: getAvatarColor(a.email),
                                }}
                            />
                        </div>
                    </div>
                    <div className="author-stats">
                        <span className="author-commits">{a.commits}</span>
                        <span className="author-clabel">commits</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---- Recent Commits Feed ----
function CommitFeed({ commits }: { commits: GraphState['recentCommits'] }) {
    if (commits.length === 0) return null;

    return (
        <div className="chart-section commit-feed-section">
            <div className="section-title">Recent Commits</div>
            <div className="commit-list">
                {commits.slice(0, 12).map((c) => {
                    const added = c.filesChanged.filter((f) => f.status === 'A').length;
                    const modified = c.filesChanged.filter((f) => f.status === 'M').length;
                    const deleted = c.filesChanged.filter((f) => f.status === 'D').length;
                    return (
                        <div key={c.hash} className="commit-item">
                            <div className="ci-avatar" style={{ background: getAvatarColor(c.email) }}>
                                {c.author.charAt(0).toUpperCase()}
                            </div>
                            <div className="ci-body">
                                <div className="ci-subject">{c.subject}</div>
                                <div className="ci-meta">
                                    <span className="ci-author">{c.author}</span>
                                    <span className="ci-hash">{c.hash.slice(0, 7)}</span>
                                    <span className="ci-date">
                                        {new Date(c.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="ci-changes">
                                    {added > 0 && <span className="ci-badge ci-added">+{added}</span>}
                                    {modified > 0 && <span className="ci-badge ci-modified">~{modified}</span>}
                                    {deleted > 0 && <span className="ci-badge ci-deleted">-{deleted}</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---- Hot Files ----
function HotFiles({ nodes }: { nodes: GraphState['nodes'] }) {
    const hotFiles = useMemo(() => {
        return Array.from(nodes.values())
            .filter((n) => n.type === 'file' && n.lastActivity !== null && n.activityAge < 5)
            .slice(0, 8);
    }, [nodes]);

    if (hotFiles.length === 0) return null;

    return (
        <div className="chart-section">
            <div className="section-title">🔥 Active Files</div>
            {hotFiles.map((f) => (
                <div key={f.id} className="hot-file-row">
                    <span className="hot-dot" style={{ background: getColor(f.id) }} />
                    <span className="hot-name">{f.name}</span>
                    <span className={`hot-status ${f.lastActivity}`}>{f.lastActivity}</span>
                </div>
            ))}
        </div>
    );
}

// ---- Main Left Panel ----
export function LeftPanel({ state }: LeftPanelProps) {
    const { nodes, recentCommits } = state;

    if (nodes.size === 0 && recentCommits.length === 0) {
        return (
            <aside className="left-panel left-panel-empty">
                <div className="empty-info">
                    <div className="empty-hex">⬡</div>
                    <p>Commit data will appear here once you start visualizing a repository.</p>
                    <ul className="legend-key">
                        <li><span className="ld" style={{ background: '#22c55e' }} /> Added files</li>
                        <li><span className="ld" style={{ background: '#f59e0b' }} /> Modified files</li>
                        <li><span className="ld" style={{ background: '#ef4444' }} /> Deleted files</li>
                        <li><span className="ld" style={{ background: '#334155' }} /> Directories</li>
                    </ul>
                </div>
            </aside>
        );
    }

    return (
        <aside className="left-panel">
            <HotFiles nodes={nodes} />
            <FileTypeChart nodes={nodes} />
            <AuthorLeaderboard commits={recentCommits} />
            <CommitFeed commits={recentCommits} />
        </aside>
    );
}
