import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { GourceScene } from './components/GourceScene';
import { LeftPanel } from './components/LeftPanel';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { AIChatPanel } from './components/AIChatPanel';
import { CommitDetailModal } from './components/CommitDetailModal';
import { ContributorNetwork } from './components/ContributorNetwork';
import { useGraph } from './hooks/useGraph';
import type { FileNode } from './hooks/useGraph';
import './App.css';

export default function App() {
  const {
    state, start, pause, resume, setSpeed,
    seekTo, setSelectedAuthor, changeBranch,
  } = useGraph();
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [showAI, setShowAI] = useState(true);
  const [showNetwork, setShowNetwork] = useState(false);

  return (
    <div className="app-root">
      <TopBar
        state={state}
        onStart={start}
        onToggleAI={() => setShowAI(v => !v)}
        aiOpen={showAI}
        onToggleNetwork={() => setShowNetwork(v => !v)}
        networkOpen={showNetwork}
      />

      <div className="app-body">
        {/* Left Info Panel */}
        <LeftPanel
          state={state}
          onAuthorFilter={setSelectedAuthor}
          onBranchChange={changeBranch}
        />

        {/* 3D Canvas or Contributor Network */}
        <div className="canvas-wrapper">
          {showNetwork && state.analytics ? (
            <ContributorNetwork analytics={state.analytics} commits={state.recentCommits} />
          ) : (
            <Canvas
              camera={{ position: [0, 100, 500], fov: 55, near: 1, far: 5000 }}
              gl={{ antialias: true, alpha: false }}
              style={{ background: 'transparent' }}
              dpr={[1, 2]}
            >
              <Suspense fallback={null}>
                <Stars radius={1200} depth={80} count={8000} factor={5} saturation={0} fade speed={0.2} />
                <GourceScene graphState={state} onNodeClick={setSelectedNode} />
                <OrbitControls
                  enableDamping
                  dampingFactor={0.06}
                  rotateSpeed={0.35}
                  zoomSpeed={0.9}
                  minDistance={20}
                  maxDistance={2000}
                />
              </Suspense>
            </Canvas>
          )}

          {/* Canvas overlay hints */}
          {state.nodes.size === 0 && !state.isPlaying && state.fetchPhase === 'idle' && (
            <div className="canvas-hint">
              <div className="hint-icon">⬡</div>
              <p>Enter a <strong>GitHub URL</strong> above to begin</p>
              <p className="hint-sub">e.g. https://github.com/vuejs/vue</p>
            </div>
          )}

          {/* Loading overlay */}
          {(state.fetchPhase === 'fetching' || state.fetchPhase === 'parsing') && (
            <div className="canvas-hint">
              <div className="loading-spinner" />
              <p className="loading-msg">{state.statusMessage}</p>
            </div>
          )}

          {/* Node count overlay */}
          {state.nodes.size > 0 && !showNetwork && (
            <div className="scene-overlay-badge">
              <span className="sob-item">
                <span className="sob-dot sob-dir" />
                {Array.from(state.nodes.values()).filter(n => n.type === 'dir').length} dirs
              </span>
              <span className="sob-sep">·</span>
              <span className="sob-item">
                <span className="sob-dot sob-file" />
                {Array.from(state.nodes.values()).filter(n => n.type === 'file').length} files
              </span>
              <span className="sob-sep">·</span>
              <span className="sob-item sob-click">Click any sphere for details</span>
            </div>
          )}
        </div>

        {/* AI Chat Panel */}
        {showAI && <AIChatPanel state={state} />}
      </div>

      <BottomBar
        state={state}
        onPause={pause}
        onResume={resume}
        onSpeedChange={setSpeed}
        onSeek={seekTo}
      />

      {/* Click-to-inspect modal */}
      <CommitDetailModal node={selectedNode} state={state} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
