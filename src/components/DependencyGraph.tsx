import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { buildPlanEdges } from '@/lib/planLinks';
import { usePlanStore } from '@/store/planStore';
import type { ParsedPlan } from '@/types/wiki';
import { isEpic, planStatus } from '@/lib/planKind';
import { advanceGraphLayout } from '@/lib/graphLayout';

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
  ready:         '#98c379',
  planned:        '#5c6370',
};

export function DependencyGraph() {
  const svgRef    = useRef<SVGSVGElement>(null);
  const zoomRef   = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const plans     = usePlanStore(s => s.plans);
  const repos     = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || plans.length === 0) return;

    let width  = svg.clientWidth  || 900;
    let height = svg.clientHeight || 600;

    // Build nodes
    const nodes: Node[] = plans.map((p, i) => {
      const color = STATUS_COLORS[planStatus(p) ?? ''] ?? '#5c6370';
      const angle = (2 * Math.PI * i) / plans.length;
      return {
        id: p.id, title: p.frontmatter.title, color, plan: p,
        x: width / 2 + 100 * Math.cos(angle),
        y: height / 2 + 100 * Math.sin(angle),
      };
    });

    const links: Link[] = buildPlanEdges(plans);

    // Clear old content
    const sel = d3.select(svg);
    sel.selectAll('*').remove();

    const g = sel.append('g');

    // Zoom/pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', e => g.attr('transform', e.transform));
    zoomRef.current = zoom;
    sel.call(zoom);

    // Arrow markers
    const defs = sel.append('defs');
    for (const [id, color] of [['dep', '#61afef'], ['ref', 'hsl(var(--muted-foreground))']] as const) {
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
      .attr('stroke', d => d.type === 'dep' ? '#61afef' : 'hsl(var(--muted-foreground))')
      .attr('stroke-width', d => d.type === 'dep' ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.type === 'ref' ? '4,3' : null)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    let frame = 0;
    let draw = () => {};
    const runFrame = () => {
      frame = 0;
      const more = advanceGraphLayout(sim, () => performance.now());
      draw();
      if (more) schedule();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(runFrame); };

    // Nodes
    const drag = d3.drag<SVGGElement, Node>()
      .on('start', (event, d) => {
        if (!event.active) { sim.alphaTarget(0.3); sim.alpha(0.3); schedule(); }
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; d.x = event.x; d.y = event.y; draw(); schedule(); })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
        schedule();
      });

    const node = g.append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', d => {
        const repo = repos.find(r => r.id === d.plan.repoId);
        return `Open ${isEpic(d.plan) ? 'Epic' : 'plan'}: ${d.title} — ${repo?.label ?? d.plan.fileName}`;
      })
      .call(drag);

    node.append('circle')
      .attr('class', 'focus-ring')
      .attr('r', 25)
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--ring))')
      .attr('stroke-width', 3)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    node.filter(d => !isEpic(d.plan)).append('circle')
      .attr('r', 16)
      .attr('fill', d => d.color + '22')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2);

    node.filter(d => isEpic(d.plan)).append('rect')
      .attr('x', -16).attr('y', -16).attr('width', 32).attr('height', 32)
      .attr('rx', 5)
      .attr('fill', '#c678dd22')
      .attr('stroke', '#c678dd')
      .attr('stroke-width', 2);
    node.filter(d => isEpic(d.plan)).append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '11px').attr('font-weight', '700')
      .attr('fill', '#c678dd').text('E');

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
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-family', 'Inter, sans-serif')
      .text(d => d.title.length > 26 ? d.title.slice(0, 24) + '…' : d.title);

    const activate = (d: Node) => selectPlan(d.plan.id);
    node
      .on('click', (_event, d) => activate(d))
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate(d);
      })
      .on('focus', function () {
        d3.select(this).select<SVGCircleElement>('.focus-ring').attr('opacity', 1);
      })
      .on('blur', function () {
        d3.select(this).select<SVGCircleElement>('.focus-ring').attr('opacity', 0);
      });
    node.append('title').text(d => d.plan.frontmatter.title);

    draw = () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    };

    sim.stop();
    draw();
    schedule();

    const observer = new ResizeObserver(() => {
      const nextWidth = svg.clientWidth || width;
      const nextHeight = svg.clientHeight || height;
      if (nextWidth === width && nextHeight === height) return;
      const dx = (nextWidth - width) / 2;
      const dy = (nextHeight - height) / 2;
      width = nextWidth;
      height = nextHeight;
      for (const node of nodes) {
        node.x = (node.x ?? 0) + dx;
        node.y = (node.y ?? 0) + dy;
        if (node.fx != null) node.fx += dx;
        if (node.fy != null) node.fy += dy;
      }
      (sim.force('center') as d3.ForceCenter<Node>).x(width / 2).y(height / 2);
      const current = d3.zoomTransform(svg);
      sel.call(zoom.transform, d3.zoomIdentity.translate(
        current.x + dx * (1 - current.k), current.y + dy * (1 - current.k),
      ).scale(current.k));
      draw();
      sim.alpha(0.3);
      schedule();
    });
    observer.observe(svg);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      sim.stop();
      if (zoomRef.current === zoom) zoomRef.current = null;
    };
  }, [plans, repos, selectPlan]);

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  };

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div role="group" aria-label="Plan dependency graph" className="relative w-full h-full min-h-[500px]">
      {plans.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Load plans to see the dependency graph.
        </div>
      ) : (
        <>
          <svg id="dependency-graph" ref={svgRef} className="w-full h-full" />
          <div aria-label="Graph controls" className="absolute left-4 top-4 flex gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-sm">
            <button
              type="button"
              aria-label="Zoom in"
              aria-controls="dependency-graph"
              onClick={() => zoomBy(1.25)}
              className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              aria-controls="dependency-graph"
              onClick={() => zoomBy(0.8)}
              className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Reset zoom"
              aria-controls="dependency-graph"
              onClick={resetZoom}
              className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-1.5 bg-card border border-border rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#61afef" strokeWidth="1.5" /></svg>
              Dependency link
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#5c6370" strokeWidth="1" strokeDasharray="4,3" /></svg>
              Plan / phase reference
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-od-purple text-[9px] font-bold text-od-purple">E</span>
              Epic (no phases)
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
