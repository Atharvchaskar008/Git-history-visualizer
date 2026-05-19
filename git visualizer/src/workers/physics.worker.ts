/// <reference lib="webworker" />
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d';

interface NodeDatum {
    id: string;
    x?: number; y?: number; z?: number;
    vx?: number; vy?: number; vz?: number;
}
interface LinkDatum { source: string; target: string; }

let simulation: any = null;
let nodes: NodeDatum[] = [];
let links: LinkDatum[] = [];

function rebuildSimulation() {
    if (simulation) simulation.stop();
    simulation = forceSimulation(nodes, 3)
        .force('link', forceLink(links)
            .id((d: any) => d.id)
            .distance(120)
            .strength(0.3)
        )
        .force('charge', forceManyBody()
            .strength(-500)       // stronger repulsion — nodes spread far apart
            .distanceMax(1000)
        )
        .force('center', forceCenter(0, 0, 0).strength(0.03))
        .force('collide', forceCollide(30).strength(0.9))
        .alphaDecay(0.003)      // slower decay — simulation runs longer
        .velocityDecay(0.4)
        .on('tick', () => {
            const positions: Record<string, [number, number, number]> = {};
            for (const n of nodes) {
                positions[n.id] = [n.x ?? 0, n.y ?? 0, n.z ?? 0];
            }
            self.postMessage({ type: 'tick', positions });
        });
}

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'addNodes') {
        const existingIds = new Set(nodes.map((n) => n.id));
        for (const n of (payload.nodes as NodeDatum[])) {
            if (!existingIds.has(n.id)) {
                // Random spawn in a wide sphere  
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 150 + Math.random() * 200;
                nodes.push({
                    id: n.id,
                    x: r * Math.sin(phi) * Math.cos(theta),
                    y: r * Math.sin(phi) * Math.sin(theta),
                    z: r * Math.cos(phi),
                });
                existingIds.add(n.id);
            }
        }
        for (const l of (payload.links as LinkDatum[])) {
            const exists = links.some(
                (el) => el.source === l.source && el.target === l.target
            );
            if (!exists) links.push(l);
        }
        rebuildSimulation();
    }

    if (type === 'reset') {
        if (simulation) simulation.stop();
        nodes = [];
        links = [];
        self.postMessage({ type: 'tick', positions: {} });
    }
};
