import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { usePlanStore } from '@/store/planStore';
import type { ParsedPlan } from '@/types/wiki';

interface Node extends d3.SimulationNodeDatum {
  id:    string;
  title: string;
  color: string;
  plan:  ParsedPlan;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  type: 'dep' | 'ref';
}

const STATUS_COLORS: Record<string, string> = {
  'in-progress': '#61afef',
  'waiting-on-validation': '#e5c07b',
  blocked:       '#e06c75',
  planned:        '#5c6370',
};

export function DependencyGraph() {
  const svgRef    = useRef<SVGSVGElement>(null);
  const plans     = usePlanStore(s => s.plans);
  const repos     = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || plans.length === 0) return;

    const width  = svg.clientWidth  || 900;
    const height = svg.clientHeight || 600;

    // Build nodes
    const nodes: Node[] = plans.map((p, i) => {
      const color = STATUS_COLORS[p.frontmatter.status ?? ''] ?? '#5c6370';
      const angle = (2 * Math.PI * i) / plans.length;
      return {
        id: p.id, title: p.frontmatter.title, color, plan: p,
        x: width / 2 + 100 * Math.cos(angle),
        y: height / 2 + 100 * Math.sin(angle),
      };
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    const planByName = new Map<string, ParsedPlan>();
    const planByPhase = new Map<string, ParsedPlan[]>();
    for (const p of plans) {
      const parts = p.fileName.split('/');
      for (let i = 0; i < parts.length; i++) {
        const key = parts.slice(i).join('/');
        if (!planByName.has(key)) planByName.set(key, p);
      }
      for (const s of p.sections) {
        for (const ph of s.phases) {
          const owners = planByPhase.get(ph.id);
          if (!owners) planByPhase.set(ph.id, [p]);
          else if (!owners.includes(p)) owners.push(p);
        }
      }
    }

    // Build links from .md dep links
    const links: Link[] = [];
    for (const plan of plans) {
      for (const dep of plan.dependencies) {
        const targetName = dep.href.split('/').pop()?.split('?')[0] ?? '';
        const target = planByName.get(targetName);
        if (target && nodeById.has(target.id)) {
          links.push({ source: plan.id, target: target.id, type: 'dep' });
        }
      }
      // PA-XX cross refs — link to the first other plan that defines that phase id
      for (const ref of plan.phaseRefs) {
        const target = planByPhase.get(ref)?.find(p => p.id !== plan.id);
        if (target && nodeById.has(target.id)) {
          links.push({ source: plan.id, target: target.id, type: 'ref' });
        }
      }
    }

    // Clear old content
    const sel = d3.select(svg);
    sel.selectAll('*').remove();

    const g = sel.append('g');

    // Zoom/pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', e => g.attr('transform', e.transform));
    sel.call(zoom);

    // Arrow markers
    const defs = sel.append('defs');
    for (const [id, color] of [['dep', '#61afef'], ['ref', '#5c6370']] as const) {
      defs.append('marker')
        .attr('id', `arrow-${id}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    }

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(140).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40));

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.type === 'dep' ? '#61afef' : '#3e4451')
      .attr('stroke-width', d => d.type === 'dep' ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.type === 'ref' ? '4,3' : null)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Nodes
    const drag = d3.drag<SVGGElement, Node>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    const node = g.append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag);

    node.append('circle')
      .attr('r', 16)
      .attr('fill', d => d.color + '22')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2);

    // Repo colour ring
    node.append('circle')
      .attr('r', 20)
      .attr('fill', 'none')
      .attr('stroke', d => {
        const repo = repos.find(r => r.id === d.plan.repoId);
        return repo?.color ?? '#3e4451';
      })
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,2')
      .attr('stroke-opacity', 0.5);

    // Labels
    node.append('text')
      .attr('dy', 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#abb2bf')
      .attr('font-family', 'Inter, sans-serif')
      .text(d => d.title.length > 26 ? d.title.slice(0, 24) + '…' : d.title);

    node.on('click', (_event, d) => selectPlan(d.plan.id));
    node.append('title').text(d => d.plan.frontmatter.title);

    const draw = () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    };

    sim.on('tick', draw);
    sim.stop();
    sim.tick(300);
    draw();

    return () => { sim.stop(); };
  }, [plans, repos, selectPlan]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Load plans to see the dependency graph.
        </div>
      ) : (
        <>
          <svg ref={svgRef} className="w-full h-full" />
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-card border border-border rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#61afef" strokeWidth="1.5" /></svg>
              .md link
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#5c6370" strokeWidth="1" strokeDasharray="4,3" /></svg>
              PA-XX ref
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <span className="inline-block w-3 h-3 rounded-full border-2" style={{ background: '#61afef22', borderColor: '#61afef' }} />
              in-progress
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full border-2" style={{ background: '#e5c07b22', borderColor: '#e5c07b' }} />
              waiting-on-validation
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full border-2" style={{ background: '#e06c7522', borderColor: '#e06c75' }} />
              blocked
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full border-2" style={{ background: '#5c637022', borderColor: '#5c6370' }} />
              planned
            </div>
          </div>
        </>
      )}
    </div>
  );
}
