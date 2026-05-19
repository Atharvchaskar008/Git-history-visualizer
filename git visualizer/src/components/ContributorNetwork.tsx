import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { RepoAnalytics } from '../lib/githubApi';

interface ContributorNetworkProps {
    analytics: RepoAnalytics;
    commits: any[];
}

export function ContributorNetwork({ analytics }: ContributorNetworkProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const nodes = useMemo(() => {
        return Array.from(analytics.authorMatrix.entries()).map(([id, stats]) => ({
            id,
            radius: Math.max(10, Math.min(40, stats.commits * 1.5)),
            ...stats
        }));
    }, [analytics.authorMatrix]);

    const links = useMemo(() => {
        return analytics.contributorLinks.map(l => ({
            source: l.source,
            target: l.target,
            value: l.weight
        }));
    }, [analytics.contributorLinks]);

    useEffect(() => {
        if (!containerRef.current || nodes.length === 0) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const svg = d3.select(containerRef.current)
            .html('')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);

        // Define gradients & markers
        const defs = svg.append('defs');
        
        // Custom color scale based on cyan/amber theme
        const color = d3.scaleOrdinal<string>()
            .range(['#00dcff', '#f59e0b', '#22c55e', '#a855f7', '#ef4444', '#f97316', '#06b6d4']);

        const simulation = d3.forceSimulation(nodes as any)
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide().radius((d: any) => d.radius + 15));

        const link = svg.append('g')
            .attr('stroke', 'rgba(0, 220, 255, 0.2)')
            .attr('stroke-opacity', 0.6)
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke-width', (d: any) => Math.sqrt(d.value));

        const nodeGroup = svg.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag<any, any>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Outer glow
        nodeGroup.append('circle')
            .attr('r', (d: any) => d.radius + 6)
            .attr('fill', (d: any) => color(d.id))
            .attr('opacity', 0.15);

        // Main node
        nodeGroup.append('circle')
            .attr('r', (d: any) => d.radius)
            .attr('fill', (d: any) => color(d.id))
            .attr('stroke', '#020917')
            .attr('stroke-width', 2);

        // Initial letters
        nodeGroup.append('text')
            .text((d: any) => d.id.charAt(0).toUpperCase())
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('fill', '#fff')
            .style('font-size', (d: any) => Math.max(10, d.radius * 0.8) + 'px')
            .style('font-weight', 'bold')
            .style('font-family', 'Inter, sans-serif')
            .style('pointer-events', 'none');

        // Labels
        nodeGroup.append('text')
            .text((d: any) => d.id)
            .attr('x', (d: any) => d.radius + 8)
            .attr('y', 0)
            .attr('fill', '#e2e8f0')
            .style('font-size', '12px')
            .style('font-family', 'Inter, sans-serif')
            .style('font-weight', '500')
            .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');
            
        // Stats sublabel
        nodeGroup.append('text')
            .text((d: any) => `${d.commits} commits, ${d.files} files`)
            .attr('x', (d: any) => d.radius + 8)
            .attr('y', 14)
            .attr('fill', '#64748b')
            .style('font-size', '10px')
            .style('font-family', 'Inter, sans-serif');

        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            nodeGroup
                .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return () => {
            simulation.stop();
        };
    }, [nodes, links]);

    return (
        <div className="network-container" style={{ width: '100%', height: '100%', background: '#020917' }}>
            <div className="network-header" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, color: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#00dcff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⬡</span> Contributor Collaboration Network
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                    Nodes represent authors. Links show shared files.
                </p>
            </div>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
