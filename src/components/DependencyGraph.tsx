import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Crosshair, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { GraphLayoutMode, GraphNodeView } from '@/lib/graphView';
import { connectedNodeIds, graphLayoutPositions } from '@/lib/graphView';
import { advanceGraphLayout } from '@/lib/graphLayout';
import type { PlanEdge } from '@/lib/planLinks';
import { usePlanStore } from '@/store/planStore';
import type { WikiRepo } from '@/types/wiki';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  graphId: string;
  color: string;
  view: GraphNodeView;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  type: 'dep' | 'ref';
  source: string | Node;
  target: string | Node;
}

interface DependencyGraphProps {
  nodes: GraphNodeView[];
  edges: PlanEdge[];
  repos: WikiRepo[];
  layout: GraphLayoutMode;
  selectedId: string | null;
  neighborhood: Set<string>;
  matchingIds: Set<string>;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  onPreview: (id: string | null) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'in-progress': '#61afef',
  'waiting-on-validation': '#e5c07b',
  blocked: '#e06c75',
  ready: '#98c379',
  planned: '#5c6370',
  unknown: '#5c6370',
};

const nodeId = (value: string | Node) => typeof value === 'string' ? value : value.id;

export function DependencyGraph({
  nodes: nodeViews, edges, repos, layout, selectedId, neighborhood, matchingIds,
  onSelect, onActivate, onPreview,
}: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const miniRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const positionsRef = useRef(new Map<string, { x: number; y: number }>());
  const transformRef = useRef(d3.zoomIdentity);
  const centerRef = useRef<(id: string, focus?: boolean) => void>(() => undefined);
  const fitRef = useRef<() => void>(() => undefined);
  const previousSelectionRef = useRef<string | null>(null);
  const lastActivatedRef = useRef<string | null>(null);
  const wasDetailOpenRef = useRef(false);
  const detailOpen = usePlanStore(state => state.detailOpen);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || nodeViews.length === 0) return;

    let width = svg.clientWidth || 900;
    let height = svg.clientHeight || 600;
    const groupedPositions = graphLayoutPositions(nodeViews, edges, layout, width, height);
    const nodes: Node[] = nodeViews.map((view, index) => {
      const saved = positionsRef.current.get(view.id);
      const grouped = groupedPositions.get(view.id);
      const angle = (2 * Math.PI * index) / nodeViews.length;
      return {
        id: view.id,
        title: view.title,
        graphId: view.graphId,
        color: STATUS_COLORS[view.status] ?? STATUS_COLORS.unknown!,
        view,
        x: grouped?.x ?? saved?.x ?? width / 2 + 100 * Math.cos(angle),
        y: grouped?.y ?? saved?.y ?? height / 2 + 100 * Math.sin(angle),
      };
    });
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const links: Link[] = edges.map(edge => ({ ...edge }));
    const sel = d3.select(svg);
    sel.selectAll('*').remove();
    const g = sel.append('g').attr('transform', transformRef.current.toString());
    let draw = () => undefined;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', event => {
        transformRef.current = event.transform;
        g.attr('transform', event.transform);
        draw();
      });
    zoomRef.current = zoom;
    sel.call(zoom).call(zoom.transform, transformRef.current);

    const defs = sel.append('defs');
    for (const [id, color] of [
      ['dep', '#61afef'], ['ref', '#7f8490'], ['incoming', '#98c379'], ['outgoing', '#e5c07b'],
    ] as const) {
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

    if (layout !== 'force') {
      const labels = new Map<string, number>();
      for (const position of groupedPositions.values()) labels.set(position.group, position.x);
      g.append('g').attr('aria-hidden', 'true')
        .selectAll('text').data([...labels]).join('text')
        .attr('x', item => item[1]).attr('y', 24).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 600)
        .attr('fill', 'hsl(var(--muted-foreground))').text(item => item[0]);
    }

    const sim = d3.forceSimulation(nodes);
    if (layout === 'force') {
      sim.force('link', d3.forceLink<Node, Link>(links).id(node => node.id).distance(140).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-260))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(42));
    } else {
      for (const node of nodes) {
        const position = groupedPositions.get(node.id)!;
        node.fx = position.x;
        node.fy = position.y;
      }
    }

    const faded = (id: string) => neighborhood.size > 0 && !neighborhood.has(id);
    const linkColor = (edge: Link) => {
      if (selectedId && nodeId(edge.target) === selectedId) return '#98c379';
      if (selectedId && nodeId(edge.source) === selectedId) return '#e5c07b';
      return edge.type === 'dep' ? '#61afef' : '#7f8490';
    };
    const linkMarker = (edge: Link) => {
      if (selectedId && nodeId(edge.target) === selectedId) return 'url(#arrow-incoming)';
      if (selectedId && nodeId(edge.source) === selectedId) return 'url(#arrow-outgoing)';
      return `url(#arrow-${edge.type})`;
    };
    const linkOpacity = (edge: Link) => {
      const unrelated = faded(nodeId(edge.source)) || faded(nodeId(edge.target));
      if (unrelated) return 0.08;
      return selectedId && nodeId(edge.source) !== selectedId && nodeId(edge.target) !== selectedId ? 0.25 : 0.8;
    };

    const link = g.append('g').attr('aria-hidden', 'true')
      .selectAll('line').data(links).join('line')
      .attr('stroke', linkColor)
      .attr('stroke-width', edge => selectedId && (nodeId(edge.source) === selectedId || nodeId(edge.target) === selectedId) ? 2.5 : edge.type === 'dep' ? 1.5 : 1)
      .attr('stroke-dasharray', edge => edge.type === 'ref' ? '4,3' : null)
      .attr('stroke-opacity', linkOpacity)
      .attr('marker-end', linkMarker);

    const edgeLabels = g.append('g').attr('aria-hidden', 'true')
      .selectAll('text')
      .data(links.filter(edge => !!selectedId && (nodeId(edge.source) === selectedId || nodeId(edge.target) === selectedId)))
      .join('text')
      .attr('font-size', 9).attr('font-weight', 600).attr('text-anchor', 'middle')
      .attr('paint-order', 'stroke').attr('stroke', 'hsl(var(--background))').attr('stroke-width', 3)
      .attr('fill', edge => linkColor(edge))
      .text(edge => edge.type === 'dep' ? 'depends on' : 'references');

    let frame = 0;
    const runFrame = () => {
      frame = 0;
      const more = layout === 'force' && advanceGraphLayout(sim, () => performance.now());
      draw();
      if (more) schedule();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(runFrame); };

    const drag = d3.drag<SVGGElement, Node>()
      .on('start', (event, node) => {
        if (layout === 'force' && !event.active) { sim.alphaTarget(0.3); sim.alpha(0.3); schedule(); }
        node.fx = node.x; node.fy = node.y;
      })
      .on('drag', (event, node) => {
        node.fx = event.x; node.fy = event.y; node.x = event.x; node.y = event.y;
        draw(); schedule();
      })
      .on('end', (event, node) => {
        if (layout === 'force') {
          if (!event.active) sim.alphaTarget(0);
          node.fx = null; node.fy = null; schedule();
        }
      });

    const node = g.append('g')
      .selectAll<SVGGElement, Node>('g').data(nodes).join('g')
      .attr('data-node-id', item => item.id)
      .attr('cursor', 'pointer').attr('role', 'button').attr('tabindex', 0)
      .attr('opacity', item => faded(item.id) ? 0.16 : 1)
      .attr('aria-label', item => `Open ${item.view.kind === 'epic' ? 'Epic' : 'plan'}: ${item.title} — ${item.view.repoLabel} — ID ${item.graphId}`)
      .call(drag);

    node.append('circle').attr('class', 'focus-ring').attr('r', 25).attr('fill', 'none')
      .attr('stroke', 'hsl(var(--ring))').attr('stroke-width', 3).attr('opacity', 0)
      .attr('pointer-events', 'none');
    node.append('circle').attr('class', 'selection-ring').attr('r', 28).attr('fill', 'none')
      .attr('stroke', '#e5c07b').attr('stroke-width', 2)
      .attr('stroke-dasharray', item => matchingIds.has(item.id) ? '3,2' : null)
      .attr('opacity', item => item.id === selectedId ? 1 : 0).attr('pointer-events', 'none');

    node.filter(item => item.view.kind === 'plan').append('circle')
      .attr('r', 16).attr('fill', item => `${item.color}22`).attr('stroke', item => item.color).attr('stroke-width', 2);
    node.filter(item => item.view.kind === 'epic').append('rect')
      .attr('x', -16).attr('y', -16).attr('width', 32).attr('height', 32).attr('rx', 5)
      .attr('fill', '#c678dd22').attr('stroke', '#c678dd').attr('stroke-width', 2);
    node.append('text').attr('class', 'plan-id').attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central').attr('font-size', '8px').attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace').attr('letter-spacing', '0.35px')
      .attr('fill', item => item.view.kind === 'epic' ? '#c678dd' : item.color).text(item => item.graphId);
    node.append('circle').attr('r', 20).attr('fill', 'none')
      .attr('stroke', item => repos.find(repo => repo.id === item.view.repoId)?.color ?? '#3e4451')
      .attr('stroke-width', 1).attr('stroke-dasharray', '3,2').attr('stroke-opacity', 0.5);
    node.append('text').attr('dy', 32).attr('text-anchor', 'middle').attr('font-size', '10px')
      .attr('fill', 'hsl(var(--foreground))').attr('font-family', 'Inter, sans-serif')
      .text(item => item.title.length > 26 ? `${item.title.slice(0, 24)}…` : item.title);
    node.append('title').text(item => `${item.graphId} — ${item.title} — ${item.view.status}`);

    const focusConnected = (event: KeyboardEvent, item: Node) => {
      if (!event.key.startsWith('Arrow')) return false;
      const connections = connectedNodeIds(item.id, edges);
      const candidates = [...new Set([...connections.incoming, ...connections.outgoing])]
        .filter(id => nodeById.has(id)).sort((a, b) => nodeById.get(a)!.title.localeCompare(nodeById.get(b)!.title));
      if (!candidates.length) return true;
      const targetId = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? candidates.at(-1)! : candidates[0]!;
      onSelect(targetId);
      onPreview(targetId);
      node.filter(candidate => candidate.id === targetId).node()?.focus();
      return true;
    };

    const activate = (id: string) => { lastActivatedRef.current = id; onSelect(id); onActivate(id); };
    node.on('click', (_event, item) => activate(item.id))
      .on('keydown', (event: KeyboardEvent, item) => {
        if (focusConnected(event, item)) { event.preventDefault(); return; }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); activate(item.id);
      })
      .on('mouseenter', (_event, item) => onPreview(item.id))
      .on('mouseleave', () => onPreview(null))
      .on('focus', function (_event, item) {
        d3.select(this).select<SVGCircleElement>('.focus-ring').attr('opacity', 1);
        onPreview(item.id);
      })
      .on('blur', function () {
        d3.select(this).select<SVGCircleElement>('.focus-ring').attr('opacity', 0);
      });

    const mini = d3.select(miniRef.current);
    mini.selectAll('*').remove();
    const miniNodes = mini.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', 2.5).attr('fill', item => item.color).attr('opacity', item => faded(item.id) ? 0.2 : 0.9);
    const viewport = mini.append('rect').attr('fill', 'none').attr('stroke', 'hsl(var(--ring))').attr('stroke-width', 1);

    draw = () => {
      // Keep interactive nodes out from under the overlaid graph controls and minimap.
      const nodeInset = 42;
      const controlsRight = Math.min(width - nodeInset, 235);
      const controlsBottom = 82;
      const minimapLeft = Math.max(nodeInset, width - 190);
      const minimapTop = Math.max(nodeInset, height - 125);
      for (const item of nodes) {
        item.x = Math.max(nodeInset, Math.min(width - nodeInset, item.x ?? width / 2));
        item.y = Math.max(nodeInset, Math.min(height - nodeInset, item.y ?? height / 2));
        if (item.x < controlsRight && item.y < controlsBottom) {
          const moveRight = controlsRight - item.x;
          const moveDown = controlsBottom - item.y;
          if (moveRight < moveDown) item.x = controlsRight; else item.y = controlsBottom;
        }
        if (item.x > minimapLeft && item.y > minimapTop) {
          const moveLeft = item.x - minimapLeft;
          const moveUp = item.y - minimapTop;
          if (moveLeft < moveUp) item.x = minimapLeft; else item.y = minimapTop;
        }
      }
      link.attr('x1', edge => (edge.source as Node).x!).attr('y1', edge => (edge.source as Node).y!)
        .attr('x2', edge => (edge.target as Node).x!).attr('y2', edge => (edge.target as Node).y!);
      edgeLabels.attr('x', edge => ((edge.source as Node).x! + (edge.target as Node).x!) / 2)
        .attr('y', edge => ((edge.source as Node).y! + (edge.target as Node).y!) / 2 - 5);
      node.attr('transform', item => `translate(${item.x},${item.y})`);
      for (const item of nodes) positionsRef.current.set(item.id, { x: item.x ?? width / 2, y: item.y ?? height / 2 });
      const sx = 128 / Math.max(width, 1); const sy = 80 / Math.max(height, 1);
      miniNodes.attr('cx', item => (item.x ?? 0) * sx).attr('cy', item => (item.y ?? 0) * sy);
      const transform = transformRef.current;
      viewport.attr('x', Math.max(0, -transform.x / transform.k * sx))
        .attr('y', Math.max(0, -transform.y / transform.k * sy))
        .attr('width', Math.min(128, width / transform.k * sx))
        .attr('height', Math.min(80, height / transform.k * sy));
    };

    const applyTransform = (transform: d3.ZoomTransform, duration = 180) => {
      const target = duration ? sel.transition().duration(duration) : sel;
      target.call(zoom.transform, transform);
    };
    centerRef.current = (id, focus = false) => {
      const item = nodeById.get(id);
      if (!item) return;
      const scale = Math.max(1, transformRef.current.k);
      applyTransform(d3.zoomIdentity.translate(width / 2 - (item.x ?? 0) * scale, height / 2 - (item.y ?? 0) * scale).scale(scale));
      node.filter(candidate => candidate.id === id).select('.selection-ring')
        .interrupt().attr('opacity', 1).attr('r', 28).transition().duration(220).attr('r', 35).transition().duration(220).attr('r', 28);
      if (focus) node.filter(candidate => candidate.id === id).node()?.focus();
    };
    fitRef.current = () => {
      const xs = nodes.map(item => item.x ?? width / 2); const ys = nodes.map(item => item.y ?? height / 2);
      const minX = Math.min(...xs) - 50; const maxX = Math.max(...xs) + 50;
      const minY = Math.min(...ys) - 50; const maxY = Math.max(...ys) + 50;
      const scale = Math.min(2, Math.max(0.25, Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.9));
      applyTransform(d3.zoomIdentity.translate(width / 2 - ((minX + maxX) / 2) * scale, height / 2 - ((minY + maxY) / 2) * scale).scale(scale));
    };

    sim.stop(); draw(); schedule();
    const observer = new ResizeObserver(() => {
      const nextWidth = svg.clientWidth || width;
      const nextHeight = svg.clientHeight || height;
      if (nextWidth === width && nextHeight === height) return;
      const dx = (nextWidth - width) / 2;
      const dy = (nextHeight - height) / 2;
      width = nextWidth; height = nextHeight;
      if (layout === 'force') {
        for (const item of nodes) {
          item.x = (item.x ?? 0) + dx; item.y = (item.y ?? 0) + dy;
          if (item.fx != null) item.fx += dx;
          if (item.fy != null) item.fy += dy;
        }
        (sim.force('center') as d3.ForceCenter<Node>).x(width / 2).y(height / 2);
        sim.alpha(0.3); schedule();
      } else {
        const resized = graphLayoutPositions(nodeViews, edges, layout, width, height);
        for (const item of nodes) {
          const position = resized.get(item.id)!;
          item.x = position.x; item.y = position.y; item.fx = position.x; item.fy = position.y;
        }
      }
      const current = transformRef.current;
      sel.call(zoom.transform, d3.zoomIdentity.translate(
        current.x + dx * (1 - current.k), current.y + dy * (1 - current.k),
      ).scale(current.k));
      draw();
    });
    observer.observe(svg);
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame); sim.stop();
      if (zoomRef.current === zoom) zoomRef.current = null;
    };
  }, [nodeViews, edges, repos, layout, selectedId, neighborhood, matchingIds, onSelect, onActivate, onPreview]);

  useEffect(() => {
    if (!selectedId || previousSelectionRef.current === selectedId) return;
    previousSelectionRef.current = selectedId;
    const timer = window.setTimeout(() => centerRef.current(selectedId, true), 30);
    return () => window.clearTimeout(timer);
  }, [selectedId, nodeViews]);

  useEffect(() => {
    if (detailOpen) { wasDetailOpenRef.current = true; return; }
    if (!wasDetailOpenRef.current || !lastActivatedRef.current) return;
    wasDetailOpenRef.current = false;
    const id = lastActivatedRef.current;
    const timer = window.setTimeout(() => {
      svgRef.current?.querySelector<SVGGElement>(`[data-node-id="${CSS.escape(id)}"]`)?.focus();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [detailOpen]);

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  };
  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div role="group" aria-label="Plan dependency graph" className="relative h-full min-h-[500px] w-full">
      {nodeViews.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No plans match the graph filters.
        </div>
      ) : (
        <>
          <svg id="dependency-graph" ref={svgRef} className="h-full w-full" />
          <div aria-label="Graph controls" className="absolute left-4 top-4 flex gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-sm">
            <GraphButton label="Zoom in" onClick={() => zoomBy(1.25)}><ZoomIn className="h-4 w-4" /></GraphButton>
            <GraphButton label="Zoom out" onClick={() => zoomBy(0.8)}><ZoomOut className="h-4 w-4" /></GraphButton>
            <GraphButton label="Reset zoom" onClick={resetZoom}><RotateCcw className="h-4 w-4" /></GraphButton>
            <GraphButton label="Fit graph" onClick={() => fitRef.current()}><Maximize2 className="h-4 w-4" /></GraphButton>
            <GraphButton label="Center selected plan" disabled={!selectedId} onClick={() => selectedId && centerRef.current(selectedId, true)}>
              <Crosshair className="h-4 w-4" />
            </GraphButton>
          </div>
          <button type="button" aria-label="Fit graph from minimap" onClick={() => fitRef.current()}
            className="absolute bottom-4 right-4 rounded-lg border border-border bg-card/95 p-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <svg ref={miniRef} width="128" height="80" aria-hidden="true" />
            <span className="sr-only">Minimap</span>
          </button>
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-border bg-card/90 px-3 py-2 text-[10px] text-muted-foreground">
            <span className="text-[#98c379]">Incoming</span> · <span className="text-[#e5c07b]">Outgoing</span> · dashed = reference
          </div>
        </>
      )}
    </div>
  );
}

function GraphButton({ label, onClick, disabled, children }: {
  label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} aria-controls="dependency-graph" disabled={disabled} onClick={onClick}
      className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}
