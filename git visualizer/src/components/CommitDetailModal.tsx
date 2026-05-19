import type { FileNode } from '../hooks/useGraph';
import type { GraphState } from '../hooks/useGraph';

interface CommitDetailModalProps {
    node: FileNode | null;
    state: GraphState;
    onClose: () => void;
}

function getStatusLabel(s: string) {
    if (s === 'A') return { label: 'Added', cls: 'ci-added' };
    if (s === 'D') return { label: 'Deleted', cls: 'ci-deleted' };
    return { label: 'Modified', cls: 'ci-modified' };
}

function getAvatarColor(email: string): string {
    let hash = 0;
    for (const c of email) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

export function CommitDetailModal({ node, state, onClose }: CommitDetailModalProps) {
    if (!node) return null;

    // Find commits that touched this file
    const relatedCommits = state.recentCommits.filter((c) =>
        c.filesChanged.some((f) => f.path.replace(/\\/g, '/') === node.id || f.path.endsWith(node.name))
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-icon">{node.type === 'dir' ? '📁' : '📄'}</div>
                    <div className="modal-title-block">
                        <div className="modal-filename">{node.name}</div>
                        <div className="modal-filepath">{node.id}</div>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Stats row */}
                <div className="modal-stats">
                    <div className="modal-stat">
                        <span className="modal-stat-val">{relatedCommits.length}</span>
                        <span className="modal-stat-label">Commits</span>
                    </div>
                    <div className="modal-stat">
                        <span className="modal-stat-val" style={{ color: '#22c55e' }}>
                            {relatedCommits.filter(c => c.filesChanged.some(f => (f.path.includes(node.name)) && f.status === 'A')).length}
                        </span>
                        <span className="modal-stat-label">Added</span>
                    </div>
                    <div className="modal-stat">
                        <span className="modal-stat-val" style={{ color: '#f59e0b' }}>
                            {relatedCommits.filter(c => c.filesChanged.some(f => (f.path.includes(node.name)) && f.status === 'M')).length}
                        </span>
                        <span className="modal-stat-label">Modified</span>
                    </div>
                    {node.type === 'file' && (
                        <div className="modal-stat">
                            <span className="modal-stat-val" style={{ color: '#a855f7' }}>.{node.ext}</span>
                            <span className="modal-stat-label">Type</span>
                        </div>
                    )}
                </div>

                {/* UML-style activity timeline */}
                {relatedCommits.length > 0 && (
                    <div className="modal-timeline">
                        <div className="modal-section-title">📋 Commit History</div>
                        <div className="modal-commit-list">
                            {relatedCommits.slice(0, 15).map((c) => {
                                const fileEntry = c.filesChanged.find(f => f.path.includes(node.name));
                                const { label, cls } = fileEntry ? getStatusLabel(fileEntry.status) : { label: 'Changed', cls: 'ci-modified' };
                                return (
                                    <div key={c.hash} className="modal-commit-row">
                                        <div className="mcr-line">
                                            <div className="mcr-dot" />
                                        </div>
                                        <div className="mcr-body">
                                            <div className="mcr-top">
                                                <div className="mcr-avatar" style={{ background: getAvatarColor(c.email) }}>
                                                    {c.author.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="mcr-author">{c.author}</span>
                                                <span className={`ci-badge ${cls}`}>{label}</span>
                                                <span className="mcr-hash">{c.hash.slice(0, 7)}</span>
                                                <span className="mcr-date">{new Date(c.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <div className="mcr-subject">{c.subject}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {relatedCommits.length === 0 && (
                    <div className="modal-empty">No commits found for this {node.type}.</div>
                )}
            </div>
        </div>
    );
}
