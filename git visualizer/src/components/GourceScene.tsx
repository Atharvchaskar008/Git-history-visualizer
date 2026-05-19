import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphState, FileNode } from '../hooks/useGraph';

interface GourceSceneProps {
    graphState: GraphState;
    onNodeClick?: (node: FileNode) => void;
}

const STATUS_COLORS: Record<string, string> = {
    added: '#22c55e',
    modified: '#f59e0b',
    deleted: '#ef4444',
};

const EXT_COLORS: Record<string, string> = {
    ts: '#3b82f6', tsx: '#60a5fa', js: '#f59e0b', jsx: '#fbbf24',
    py: '#22c55e', rs: '#f97316', go: '#06b6d4', java: '#ef4444',
    css: '#a855f7', scss: '#d946ef', html: '#fb923c', md: '#94a3b8',
    json: '#facc15', yml: '#34d399', yaml: '#34d399', sh: '#86efac',
    default: '#64748b',
};

// ── Star field background ─────────────────────────────────────────────────────
function StarField() {
    const ref = useRef<THREE.Points>(null!);
    const { positions, colors } = useMemo(() => {
        const count = 2000;
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const color = new THREE.Color();
        for (let i = 0; i < count; i++) {
            // Random sphere shell distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 1200 + Math.random() * 800;
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
            // Slightly tinted star colors
            const hue = Math.random() > 0.7 ? 0.6 + Math.random() * 0.1 : Math.random() > 0.5 ? 0.08 + Math.random() * 0.08 : 0;
            color.setHSL(hue, 0.3, 0.85 + Math.random() * 0.15);
            col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b;
        }
        return { positions: pos, colors: col };
    }, []);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.rotation.y = clock.getElapsedTime() * 0.005;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial size={2.5} vertexColors transparent opacity={0.8} sizeAttenuation />
        </points>
    );
}

// ── Nebula dust particles ─────────────────────────────────────────────────────
function NebulaDust() {
    const ref = useRef<THREE.Points>(null!);
    const positions = useMemo(() => {
        const count = 600;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 1800;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 600;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 1800;
        }
        return pos;
    }, []);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.rotation.y = clock.getElapsedTime() * 0.012;
            ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.008) * 0.05;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial size={5} color="#0891b2" transparent opacity={0.05} sizeAttenuation />
        </points>
    );
}

// ── Data Packets ──────────────────────────────────────────────────────────────
function DataPackets({ edges, positions }: { edges: GraphState['edges']; positions: Record<string, [number, number, number]> }) {
    const validEdges = useMemo(() => edges.filter((e) => positions[e.source] && positions[e.target]), [edges, positions]);
    const count = Math.min(validEdges.length, 400);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const meshRef = useRef<THREE.InstancedMesh>(null!);
    const prog = useRef<Float32Array>(new Float32Array(count).map(() => Math.random()));
    const spds = useRef<Float32Array>(new Float32Array(count).map(() => 0.004 + Math.random() * 0.012));

    useFrame(() => {
        if (!meshRef.current || count === 0) return;
        const color = new THREE.Color();
        for (let i = 0; i < count; i++) {
            prog.current[i] += spds.current[i];
            if (prog.current[i] > 1) prog.current[i] = 0;
            const edge = validEdges[i % validEdges.length];
            const s = positions[edge.source], t = positions[edge.target];
            if (!s || !t) continue;
            const tp = prog.current[i];
            // Smooth cubic lerp
            const t3 = tp * tp * (3 - 2 * tp);
            dummy.position.set(
                s[0] + (t[0] - s[0]) * t3,
                s[1] + (t[1] - s[1]) * t3,
                s[2] + (t[2] - s[2]) * t3
            );
            // Scale pops at midpoint
            const scale = 1.8 + Math.sin(tp * Math.PI) * 2.8;
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            // Color flows from cyan → purple → amber
            if (tp < 0.5) {
                color.setRGB(tp * 0.5, 0.85 - tp * 0.3, 1.0);
            } else {
                color.setRGB(0.95, 0.62 + (tp - 0.5) * 0.5, 0.07);
            }
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    if (count === 0) return null;
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial vertexColors transparent opacity={0.95} />
        </instancedMesh>
    );
}

// ── Edge lines (glow variants) ────────────────────────────────────────────────
function EdgeLines({ edges, positions, activeNodes }: {
    edges: GraphState['edges'];
    positions: Record<string, [number, number, number]>;
    activeNodes: Set<string>;
}) {
    const valid = useMemo(() =>
        edges.filter((e) => positions[e.source] && positions[e.target]).slice(0, 800),
        [edges, positions]
    );

    return (
        <>
            {valid.map((e, i) => {
                const active = activeNodes.has(e.source) || activeNodes.has(e.target);
                const s = positions[e.source], t = positions[e.target];
                const points = [new THREE.Vector3(...s), new THREE.Vector3(...t)];
                const geo = new THREE.BufferGeometry().setFromPoints(points);
                const lineObj = new THREE.Line(
                    geo,
                    new THREE.LineBasicMaterial({
                        color: active ? '#00dcff' : '#0f3060',
                        transparent: true,
                        opacity: active ? 0.8 : 0.2,
                    })
                );
                return (
                    <primitive key={i} object={lineObj} />
                );
            })}
        </>
    );
}

// ── Single sphere node ────────────────────────────────────────────────────────
function NodeSphere({ node, position, isActive, onClick }: {
    node: FileNode;
    position: [number, number, number];
    isActive: boolean;
    onClick: () => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const ring1Ref = useRef<THREE.Mesh>(null!);
    const ring2Ref = useRef<THREE.Mesh>(null!);
    const glowRef = useRef<THREE.Mesh>(null!);
    const [hovered, setHovered] = useState(false);

    const isDir = node.type === 'dir';
    const baseColor = isActive && node.lastActivity
        ? STATUS_COLORS[node.lastActivity]
        : (EXT_COLORS[node.ext] ?? EXT_COLORS.default);
    const radius = isDir ? 16 : 9;

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (!meshRef.current) return;

        if (isActive) {
            const pulse = 1 + Math.sin(t * 5) * 0.15;
            meshRef.current.scale.setScalar(pulse);

            if (ring1Ref.current) {
                ring1Ref.current.rotation.z = t * 1.2;
                (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t * 4) * 0.2;
            }
            if (ring2Ref.current) {
                ring2Ref.current.rotation.x = t * 0.8;
                ring2Ref.current.rotation.z = -t * 0.5;
                (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 3 + 1) * 0.15;
            }
            if (glowRef.current) {
                glowRef.current.scale.setScalar(1.0 + Math.sin(t * 3) * 0.2);
                (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 3) * 0.06;
            }
            meshRef.current.rotation.y += 0.012;
        } else if (hovered) {
            meshRef.current.scale.setScalar(1.1);
            if (ring1Ref.current) (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.2;
            if (glowRef.current) (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08;
        } else {
            // Idle gentle float
            meshRef.current.scale.setScalar(1 + Math.sin(t * 0.8 + position[0] * 0.01) * 0.025);
            if (ring1Ref.current) (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0;
            if (ring2Ref.current) (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0;
            if (glowRef.current) (glowRef.current.material as THREE.MeshBasicMaterial).opacity = isDir ? 0.05 : 0;
        }
    });

    return (
        <group position={position} onClick={onClick} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>

            {/* Outer glow halo */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[radius * 1.7, 16, 16]} />
                <meshBasicMaterial color={baseColor} transparent opacity={isDir ? 0.05 : 0} side={THREE.BackSide} />
            </mesh>

            {/* Orbital ring 1 */}
            <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius * 1.55, 0.5, 8, 64]} />
                <meshBasicMaterial color={baseColor} transparent opacity={0} />
            </mesh>

            {/* Orbital ring 2 (tilted) */}
            <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0.3, 0]}>
                <torusGeometry args={[radius * 1.85, 0.3, 6, 48]} />
                <meshBasicMaterial color={baseColor} transparent opacity={0} />
            </mesh>

            {/* Main sphere */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[radius, isDir ? 36 : 24, isDir ? 36 : 24]} />
                <meshPhysicalMaterial
                    color={baseColor}
                    emissive={baseColor}
                    emissiveIntensity={isActive ? 2.2 : hovered ? 0.8 : isDir ? 0.15 : 0.25}
                    roughness={isDir ? 0.0 : 0.15}
                    metalness={isDir ? 0.05 : 0.8}
                    transparent
                    opacity={isDir ? 0.38 : 0.95}
                    transmission={isDir ? 0.7 : 0}
                    thickness={isDir ? 10 : 0}
                    envMapIntensity={2.5}
                    iridescence={isDir ? 0.4 : 0.1}
                    iridescenceIOR={1.3}
                />
            </mesh>

            {/* Inner nucleus for dir nodes */}
            {isDir && (
                <mesh>
                    <sphereGeometry args={[radius * 0.45, 16, 16]} />
                    <meshBasicMaterial color={baseColor} transparent opacity={0.22} />
                </mesh>
            )}

            {/* Floating label */}
            <Billboard>
                <Text
                    position={[0, radius * 1.45, 0]}
                    fontSize={isDir ? 7.5 : 5.5}
                    color={isActive ? '#ffffff' : hovered ? '#e2e8f0' : isDir ? '#cbd5e1' : '#94a3b8'}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={1}
                    outlineColor="#020917"
                    outlineOpacity={0.9}
                >
                    {node.name.length > 22 ? node.name.slice(0, 20) + '…' : node.name}
                </Text>
                {/* Extension badge */}
                {!isDir && node.ext && node.ext !== 'default' && (
                    <Text
                        position={[0, -radius * 1.4, 0]}
                        fontSize={3.8}
                        color={EXT_COLORS[node.ext] ?? '#64748b'}
                        anchorX="center"
                        anchorY="top"
                        outlineWidth={0.4}
                        outlineColor="#020917"
                    >
                        .{node.ext}
                    </Text>
                )}
            </Billboard>
        </group>
    );
}

// ── Floor grid ────────────────────────────────────────────────────────────────
function Environment() {
    const ref = useRef<THREE.GridHelper>(null!);
    useFrame(({ clock }) => {
        if (ref.current) {
            (ref.current.material as THREE.Material & { opacity: number }).opacity =
                0.18 + Math.sin(clock.getElapsedTime() * 0.3) * 0.06;
        }
    });

    return (
        <>
            <gridHelper ref={ref} args={[4000, 150, '#0c2040', '#0c2040']} position={[0, -220, 0]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -221, 0]}>
                <planeGeometry args={[4000, 4000]} />
                <meshBasicMaterial color="#00dcff" transparent opacity={0.006} />
            </mesh>
            {/* Horizon glow plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -219, 0]}>
                <planeGeometry args={[4000, 4000]} />
                <meshBasicMaterial color="#0a2060" transparent opacity={0.04} />
            </mesh>
        </>
    );
}

// ── Camera follow ─────────────────────────────────────────────────────────────
function CameraFollow({ activeNodes, positions, nodeCount }: {
    activeNodes: Set<string>;
    positions: Record<string, [number, number, number]>;
    nodeCount: number;
}) {
    const { camera } = useThree();
    const centroid = useRef(new THREE.Vector3());
    const camPos = useRef(new THREE.Vector3(0, 120, 450));
    const orbitAngle = useRef(0);

    useFrame(() => {
        // Update centroid
        if (activeNodes.size > 0) {
            const c = new THREE.Vector3();
            let n = 0;
            for (const id of activeNodes) {
                const p = positions[id];
                if (p) { c.add(new THREE.Vector3(...p)); n++; }
            }
            if (n > 0) centroid.current.lerp(c.divideScalar(n), 0.04);
        }

        const look = centroid.current;
        const dist = Math.max(260, Math.min(900, nodeCount * 4.5));
        // Gentle idle orbit
        orbitAngle.current += 0.0015;
        const targetX = look.x + Math.cos(orbitAngle.current) * dist * 0.7;
        const targetZ = look.z + Math.sin(orbitAngle.current) * dist;
        const targetY = look.y + dist * 0.38;

        camPos.current.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.012);
        camera.position.lerp(camPos.current, 0.04);
        camera.lookAt(look);
    });
    return null;
}

// ── Main scene ────────────────────────────────────────────────────────────────
export function GourceScene({ graphState, onNodeClick }: GourceSceneProps) {
    const { nodes, edges, positions, activeNodes } = graphState;

    const visibleNodes = useMemo(
        () => Array.from(nodes.values()).filter((n) => positions[n.id]),
        [nodes, positions]
    );

    return (
        <>
            {/* Lighting rig */}
            <ambientLight intensity={0.18} color="#1a2a4a" />
            <pointLight position={[500, 500, 300]} intensity={4} color="#00dcff" distance={2000} decay={1.5} />
            <pointLight position={[-400, -200, -400]} intensity={3} color="#f59e0b" distance={2000} decay={1.5} />
            <pointLight position={[0, 600, 0]} intensity={2} color="#a855f7" distance={1800} decay={1.5} />
            <pointLight position={[-500, 300, 500]} intensity={2.5} color="#22c55e" distance={1500} decay={1.8} />
            <pointLight position={[300, -100, -300]} intensity={1.8} color="#f97316" distance={1200} decay={2} />
            <fog attach="fog" args={['#020917', 700, 2500]} />

            {/* Background */}
            <StarField />
            <NebulaDust />

            {/* Scene */}
            <Environment />
            <CameraFollow activeNodes={activeNodes} positions={positions} nodeCount={nodes.size} />
            <EdgeLines edges={edges} positions={positions} activeNodes={activeNodes} />
            <DataPackets edges={edges} positions={positions} />

            {/* Nodes */}
            {visibleNodes.map((node) => (
                <NodeSphere
                    key={node.id}
                    node={node}
                    position={positions[node.id]}
                    isActive={activeNodes.has(node.id)}
                    onClick={() => onNodeClick?.(node)}
                />
            ))}
        </>
    );
}
