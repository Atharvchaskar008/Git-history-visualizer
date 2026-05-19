import type { GraphState } from '../hooks/useGraph';

interface BottomBarProps {
    state: GraphState;
    onPause: () => void;
    onResume: () => void;
    onSpeedChange: (s: number) => void;
}

export function BottomBar({ state, onPause, onResume, onSpeedChange }: BottomBarProps) {
    const latest = state.recentCommits[0];
    const dateStr = latest
        ? new Date(latest.timestamp * 1000).toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        })
        : '—';

    return (
        <footer className="bottom-bar">
            {/* Current Commit Date */}
            <div className="timeline-date">
                <span className="timeline-icon">🕐</span>
                <span className="timeline-text">{dateStr}</span>
            </div>

            {/* Progress Rail */}
            <div className="progress-rail">
                <div className="progress-fill" style={{ width: state.isDone ? '100%' : state.isPlaying ? '60%' : '0%' }} />
            </div>

            {/* Controls */}
            <div className="playback-controls">
                <button
                    className={`ctrl-btn ${!state.isPlaying ? 'ctrl-active' : ''}`}
                    onClick={state.isPlaying ? onPause : onResume}
                    title={state.isPlaying ? 'Pause' : 'Play'}
                >
                    {state.isPlaying ? '⏸' : '▶'}
                </button>

                <div className="speed-group">
                    <span className="speed-label">Speed</span>
                    {[1, 2, 5, 10, 25].map((s) => (
                        <button
                            key={s}
                            className={`speed-btn ${state.speed === s ? 'speed-active' : ''}`}
                            onClick={() => onSpeedChange(s)}
                        >
                            {s}×
                        </button>
                    ))}
                </div>
            </div>

            {/* Latest commit hash */}
            {latest && (
                <div className="bottom-hash">
                    <span className="hash-label">HEAD</span>
                    <span className="hash-value">{latest.hash.slice(0, 10)}</span>
                </div>
            )}
        </footer>
    );
}
