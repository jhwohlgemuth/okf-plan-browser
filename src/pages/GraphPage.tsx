import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DependencyGraph } from '@/components/DependencyGraph';
import { PlanStatusBadge } from '@/components/PlanStatusBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { TagBadge } from '@/components/TagBadge';
import { TimeRemaining } from '@/components/TimeRemaining';
import {
  buildGraphNodeViews, filterGraphEdges, filterGraphNodes, neighborhoodIds,
  type GraphFilters, type GraphHops, type GraphKind, type GraphLayoutMode, type GraphNodeView,
} from '@/lib/graphView';
import { getOsLabel } from '@/lib/osLabels';
import { buildPlanEdges, type PlanEdge } from '@/lib/planLinks';
import { formatPlanCounts } from '@/lib/planKind';
import {
  clearGraphState, graphCanvasScope, GRAPH_STATE_KEYS, hasGraphState,
  readGraphCanvasState, readGraphState, saveGraphCanvasState, saveGraphState,
  type GraphCanvasState,
} from '@/lib/graphState';
import { usePlanStore } from '@/store/planStore';

const VALID_LAYOUTS = new Set<GraphLayoutMode>(['force', 'dependency', 'repository', 'status', 'os']);
const csv = (value: string | null) => value?.split(',').filter(Boolean) ?? [];

export function GraphPage() {
  const plans = usePlanStore(state => state.plans);
  const repos = usePlanStore(state => state.repos);
  const openPlan = usePlanStore(state => state.selectPlan);
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [graphResetKey, setGraphResetKey] = useState(0);
  const restoredState = useRef(false);
  const restorePending = useRef(false);
  const ignoreCanvasSave = useRef(false);

  useEffect(() => {
    if (!restoredState.current) {
      restoredState.current = true;
      if (!hasGraphState(searchParams)) {
        const saved = readGraphState();
        if (saved) {
          restorePending.current = true;
          setSearchParams(current => {
            const next = new URLSearchParams(current);
            for (const key of GRAPH_STATE_KEYS) {
              const value = saved.get(key);
              if (value) next.set(key, value);
            }
            return next;
          }, { replace: true });
          return;
        }
      }
    }
    if (restorePending.current) {
      if (!hasGraphState(searchParams)) return;
      restorePending.current = false;
    }
    saveGraphState(searchParams);
  }, [searchParams, setSearchParams]);

  const allEdges = useMemo(() => buildPlanEdges(plans), [plans]);
  const allNodes = useMemo(() => buildGraphNodeViews(plans, repos), [plans, repos]);
  const canvasScope = useMemo(() => graphCanvasScope(allNodes.map(node => node.id)), [allNodes]);
  const canvasScopeRef = useRef('');
  const canvasStateRef = useRef<GraphCanvasState | null>(null);
  if (canvasScopeRef.current !== canvasScope) {
    canvasScopeRef.current = canvasScope;
    canvasStateRef.current = readGraphCanvasState(canvasScope);
  }
  const persistCanvasState = useCallback((state: GraphCanvasState) => {
    if (ignoreCanvasSave.current || state.scope !== canvasScopeRef.current) return;
    canvasStateRef.current = state;
    saveGraphCanvasState(state);
  }, []);
  useEffect(() => { ignoreCanvasSave.current = false; }, [graphResetKey]);
  const query = searchParams.get('gq') ?? '';
  const statusParam = searchParams.get('gstatus');
  const repoParam = searchParams.get('grepo');
  const kindParam = searchParams.get('gkind');
  const tagParam = searchParams.get('gtag');
  const edgeParam = searchParams.get('gedges');
  const statuses = useMemo(() => csv(statusParam), [statusParam]);
  const repoFilters = useMemo(() => csv(repoParam), [repoParam]);
  const kinds = useMemo(() => csv(kindParam).filter((value): value is GraphKind => value === 'plan' || value === 'epic'), [kindParam]);
  const tags = useMemo(() => csv(tagParam), [tagParam]);
  const blockedOnly = searchParams.get('gblocked') === '1';
  const edgeTypes = useMemo(() => {
    const result = new Set<PlanEdge['type']>(csv(edgeParam)
      .filter((value): value is PlanEdge['type'] => value === 'dep' || value === 'ref'));
    if (edgeParam === null) { result.add('dep'); result.add('ref'); }
    return result;
  }, [edgeParam]);
  const hopsValue = Number(searchParams.get('ghops') ?? 0);
  const hops: GraphHops = hopsValue === 1 || hopsValue === 2 ? hopsValue : 0;
  const layoutValue = searchParams.get('glayout') as GraphLayoutMode | null;
  const layout: GraphLayoutMode = layoutValue && VALID_LAYOUTS.has(layoutValue) ? layoutValue : 'force';
  const selectedParam = searchParams.get('gplan');

  const updateParam = useCallback((key: string, value: string | null, replace = false) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value); else next.delete(key);
      saveGraphState(next);
      return next;
    }, { replace });
  }, [setSearchParams]);
  const setList = useCallback((key: string, values: string[]) => {
    updateParam(key, values.length ? values.join(',') : null);
  }, [updateParam]);
  const toggleListValue = useCallback((key: string, values: string[], value: string) => {
    setList(key, values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  }, [setList]);

  const filters: GraphFilters = useMemo(() => ({
    query, statuses, repos: repoFilters, kinds, tags, blockedOnly,
  }), [query, statuses, repoFilters, kinds, tags, blockedOnly]);
  const visibleNodes = useMemo(() => filterGraphNodes(allNodes, filters, allEdges), [allNodes, filters, allEdges]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => filterGraphEdges(allEdges, visibleIds, edgeTypes), [allEdges, visibleIds, edgeTypes]);
  const selectedId = selectedParam && visibleIds.has(selectedParam) ? selectedParam : null;
  const neighborhood = useMemo(() => neighborhoodIds(selectedId, visibleEdges, hops), [selectedId, visibleEdges, hops]);
  const matchingIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes]);
  const nodeById = useMemo(() => new Map(allNodes.map(node => [node.id, node])), [allNodes]);
  const preview = nodeById.get(previewId ?? selectedId ?? '');

  const selectNode = useCallback((id: string) => updateParam('gplan', id), [updateParam]);
  const activateNode = useCallback((id: string) => openPlan(id), [openPlan]);
  const previewNode = useCallback((id: string | null) => setPreviewId(id), []);
  const cycleSearch = (backward: boolean) => {
    if (!visibleNodes.length) return;
    const current = visibleNodes.findIndex(node => node.id === selectedId);
    const offset = backward ? -1 : 1;
    const index = current < 0 ? (backward ? visibleNodes.length - 1 : 0)
      : (current + offset + visibleNodes.length) % visibleNodes.length;
    selectNode(visibleNodes[index]!.id);
  };

  const availableStatuses = useMemo(() => [...new Set(allNodes.map(node => node.status))].sort(), [allNodes]);
  const availableTags = useMemo(() => [...new Set(allNodes.flatMap(node => node.tags))]
    .sort((a, b) => (getOsLabel(a) ? 0 : 1) - (getOsLabel(b) ? 0 : 1) || a.localeCompare(b)), [allNodes]);
  const activeFilterCount = statuses.length + repoFilters.length + kinds.length + tags.length + Number(blockedOnly);
  const deps = visibleEdges.filter(edge => edge.type === 'dep').length;
  const refs = visibleEdges.filter(edge => edge.type === 'ref').length;

  const orderedEdges = useMemo(() => [...visibleEdges].sort((a, b) => {
    const aSelected = Number(a.source === selectedId || a.target === selectedId);
    const bSelected = Number(b.source === selectedId || b.target === selectedId);
    if (aSelected !== bSelected) return bSelected - aSelected;
    return (nodeById.get(a.source)?.title ?? a.source).localeCompare(nodeById.get(b.source)?.title ?? b.source);
  }), [visibleEdges, selectedId, nodeById]);

  const clearFilters = () => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      for (const key of ['gq', 'gstatus', 'grepo', 'gkind', 'gtag', 'gblocked']) next.delete(key);
      return next;
    });
  };

  const resetGraphState = () => {
    ignoreCanvasSave.current = true;
    clearGraphState();
    canvasStateRef.current = null;
    setPreviewId(null);
    setGraphResetKey(key => key + 1);
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      for (const key of GRAPH_STATE_KEYS) next.delete(key);
      return next;
    }, { replace: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border bg-background px-5 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">Dependency Graph</h1>
            <p className="text-xs text-muted-foreground">
              {formatPlanCounts(plans)} · {deps} .md links · {refs} phase references · <TimeRemaining plans={plans} />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button type="button" onClick={resetGraphState} title="Clear saved filters, selection, layout, and viewport"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <RotateCcw className="h-3.5 w-3.5" /> Reset graph state
            </button>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Layout</span>
              <select aria-label="Graph layout" value={layout} onChange={event => updateParam('glayout', event.target.value === 'force' ? null : event.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="force">Force</option><option value="dependency">Dependency</option>
                <option value="repository">Repository</option><option value="status">Status</option><option value="os">Operating system</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Focus</span>
              <select aria-label="Neighborhood focus" value={hops} onChange={event => updateParam('ghops', event.target.value === '0' ? null : event.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="0">All nodes</option><option value="1">1 hop</option><option value="2">2 hops</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Search graph</span>
            <input aria-label="Search graph" value={query} onChange={event => updateParam('gq', event.target.value || null, true)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); cycleSearch(event.shiftKey); } }}
              placeholder="Search ID, title, tag, repository, status, or OS…"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            {query && <button type="button" aria-label="Clear graph search" onClick={() => updateParam('gq', null, true)}
              className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <FilterMenu label="Status" values={availableStatuses} selected={statuses} onToggle={value => toggleListValue('gstatus', statuses, value)} />
          <FilterMenu label="Repository" values={repos.map(repo => repo.id)} selected={repoFilters}
            display={value => repos.find(repo => repo.id === value)?.label ?? value} onToggle={value => toggleListValue('grepo', repoFilters, value)} />
          <FilterMenu label="Kind" values={['plan', 'epic']} selected={kinds} onToggle={value => toggleListValue('gkind', kinds, value)} />
          <FilterMenu label="Tags & OS" values={availableTags} selected={tags}
            display={value => getOsLabel(value) ? `OS · ${getOsLabel(value)!.name}` : value} onToggle={value => toggleListValue('gtag', tags, value)} />
          <button type="button" aria-pressed={blockedOnly} onClick={() => updateParam('gblocked', blockedOnly ? null : '1')}
            className={`rounded-md border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${blockedOnly ? 'border-destructive bg-destructive/15 text-destructive' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
            Blocked paths
          </button>
          <EdgeToggle label="Dependencies" checked={edgeTypes.has('dep')} onChange={() => {
            const next = new Set(edgeTypes);
            if (next.has('dep')) next.delete('dep'); else next.add('dep');
            updateParam('gedges', [...next].join(',') || 'none');
          }} />
          <EdgeToggle label="References" checked={edgeTypes.has('ref')} onChange={() => {
            const next = new Set(edgeTypes);
            if (next.has('ref')) next.delete('ref'); else next.add('ref');
            updateParam('gedges', [...next].join(',') || 'none');
          }} />
          {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">Clear filters ({activeFilterCount})</button>}
        </div>
        <p role="status" aria-live="polite" className="mt-2 text-xs text-muted-foreground">
          {visibleNodes.length} of {allNodes.length} nodes visible{query ? ` for “${query}”; press Enter to cycle matches` : ''}.
          {selectedId ? ` Selected ${nodeById.get(selectedId)?.graphId}: ${nodeById.get(selectedId)?.title}.` : ''}
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-auto lg:flex">
        <div className="min-h-[500px] flex-1 overflow-hidden" data-tour="dependency-graph">
          <DependencyGraph key={`${canvasScope}:${graphResetKey}`} nodes={visibleNodes} edges={visibleEdges} repos={repos} layout={layout}
            scope={canvasScope} initialState={canvasStateRef.current} onStateChange={persistCanvasState}
            selectedId={selectedId} neighborhood={neighborhood} matchingIds={matchingIds}
            onSelect={selectNode} onActivate={activateNode} onPreview={previewNode} />
        </div>
        <aside className="shrink-0 border-t border-border bg-card/80 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <NodePreview node={preview} edges={visibleEdges} />
          <section data-tour="graph-relationships" aria-labelledby="resolved-relationships-title" className="border-t border-border p-4 text-foreground">
            <h2 id="resolved-relationships-title" className="text-sm font-semibold">Resolved relationships</h2>
            <p className="mt-1 text-xs text-muted-foreground">Selected relationships appear first. Activate one to focus its target.</p>
            <div role="note" aria-labelledby="keyboard-controls-title" className="mt-4 rounded-lg border border-border bg-background/70 p-3">
              <h3 id="keyboard-controls-title" className="text-xs font-semibold text-foreground">Keyboard controls</h3>
              <dl className="mt-2 space-y-2 text-[11px] text-muted-foreground">
                <KeyRow keys="Tab / Shift+Tab" action="Move focus" />
                <KeyRow keys="Arrow keys" action="Move to a connected node" />
                <KeyRow keys="Enter / Space" action="Open or activate" />
                <KeyRow keys="Escape" action="Close navigation or details" />
              </dl>
            </div>
            {orderedEdges.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No resolved dependencies or references.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {orderedEdges.map(edge => <RelationshipCard key={`${edge.source}\n${edge.target}\n${edge.type}`}
                  edge={edge} selectedId={selectedId} nodeById={nodeById} repos={repos} onSelect={selectNode} />)}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

const IMPACT_DOT: Record<string, string> = {
  critical: 'bg-od-red', high: 'bg-od-orange', medium: 'bg-od-yellow', low: 'bg-od-muted',
};

function RelationshipCard({ edge, selectedId, nodeById, repos, onSelect }: {
  edge: PlanEdge;
  selectedId: string | null;
  nodeById: Map<string, GraphNodeView>;
  repos: ReturnType<typeof usePlanStore.getState>['repos'];
  onSelect: (id: string) => void;
}) {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!source || !target) return null;
  const connected = selectedId === edge.target ? source : target;
  const direction = selectedId === edge.source ? 'Outgoing' : selectedId === edge.target ? 'Incoming' : null;
  const relationship = edge.type === 'dep' ? 'depends on' : 'references';
  const repo = repos.find(candidate => candidate.id === connected.repoId);
  const phase = connected.nextPhase
    ? connected.plan.sections.flatMap(section => section.phases).find(candidate => candidate.id === connected.nextPhase!.id)
    : undefined;
  const priority = connected.plan.frontmatter.priority;
  const impact = connected.plan.frontmatter.impact;

  return (
    <li>
      <button type="button" onClick={() => onSelect(connected.id)}
        aria-label={`Focus ${connected.title}; ${source.title} ${relationship} ${target.title}`}
        title={connected.plan.frontmatter.description}
        className="w-full rounded-md border border-border bg-background/70 px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold text-primary">
            {source.graphId} <span className="font-sans uppercase tracking-wide text-muted-foreground">{relationship}</span> {target.graphId}
          </span>
          {direction && <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">{direction}</span>}
        </span>

        <span className="mt-1.5 flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{connected.title}</span>
          <PlanStatusBadge plan={connected.plan} />
        </span>

        {phase ? <span className="mt-1.5 flex min-w-0 items-center gap-1.5 border-t border-border/60 pt-1.5">
          <span className="w-12 shrink-0 truncate font-mono text-[10px] font-semibold text-od-blue">{phase.id}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{phase.title}</span>
          <StatusBadge status={phase.status} className="shrink-0 px-1.5 py-0 text-[9px]" />
          <span className="shrink-0"><TimeRemaining plans={[connected.plan]} phase={phase} label={false} /></span>
        </span> : <span className="mt-1.5 block truncate border-t border-border/60 pt-1.5 text-[10px] text-od-purple">
          Coordination record · no executable phases
        </span>}

        <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={connected.kind === 'epic' ? 'font-semibold text-od-purple' : 'font-medium text-od-blue'}>
            {connected.kind === 'epic' ? 'Epic' : 'Plan'}
          </span>
          {priority && <span className="capitalize" title={`Priority: ${priority}`}>{priority}</span>}
          {impact && <span className="inline-flex items-center gap-1 capitalize" title={`Impact: ${impact}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${IMPACT_DOT[impact] ?? 'bg-od-muted'}`} />{impact} impact
          </span>}
          <span className={connected.blockedPhases ? 'font-medium text-destructive' : ''}>
            {connected.blockedPhases ? `${connected.blockedPhases} blocked phase${connected.blockedPhases === 1 ? '' : 's'}` : 'No blocked phases'}
          </span>
          <span className="ml-auto flex min-w-0 items-center gap-1 font-mono">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: repo?.color ?? '#5c6370' }} />
            <span className="max-w-20 truncate">{connected.repoLabel}</span>
          </span>
          {connected.tags.length > 0 && <span className="shrink-0">{connected.tags.length} tag{connected.tags.length === 1 ? '' : 's'}</span>}
        </span>
      </button>
    </li>
  );
}

function FilterMenu({ label, values, selected, display = value => value, onToggle }: {
  label: string; values: string[]; selected: string[]; display?: (value: string) => string; onToggle: (value: string) => void;
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <SlidersHorizontal className="h-3.5 w-3.5" />{label}{selected.length > 0 && <span className="rounded-full bg-primary/15 px-1.5 text-primary">{selected.length}</span>}
      </summary>
      <fieldset className="absolute left-0 z-30 mt-1 max-h-64 min-w-52 overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-lg">
        <legend className="sr-only">Filter by {label}</legend>
        {values.map(value => <div key={value} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent">
          <input type="checkbox" aria-label={`${label}: ${display(value)}`} checked={selected.includes(value)} onChange={() => onToggle(value)} className="accent-primary" />
          <span>{display(value)}</span>
        </div>)}
      </fieldset>
    </details>
  );
}

function EdgeToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
      <input type="checkbox" aria-label={`Show ${label.toLowerCase()}`} checked={checked} onChange={onChange} className="accent-primary" />{label}
    </div>
  );
}

function NodePreview({ node, edges }: { node: ReturnType<typeof buildGraphNodeViews>[number] | undefined; edges: PlanEdge[] }) {
  if (!node) return (
    <section aria-label="Plan preview" className="sticky top-0 z-20 border-b border-primary/25 bg-card/95 p-4 text-xs text-muted-foreground shadow-sm backdrop-blur">
      Focus, hover, or search for a node to preview its status, next phase, blockers, tags, and relationships.
    </section>
  );
  const incoming = edges.filter(edge => edge.target === node.id).length;
  const outgoing = edges.filter(edge => edge.source === node.id).length;
  const blockedTitles = node.plan.sections.flatMap(section => section.phases).filter(phase => phase.status === 'blocked').map(phase => phase.title);
  return (
    <section aria-label="Plan preview" className="sticky top-0 z-20 border-b border-primary/25 bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-mono text-[10px] font-bold tracking-wide text-primary">{node.graphId}</p><h2 className="text-sm font-semibold text-foreground">{node.title}</h2></div>
        <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">{node.status}</span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="text-muted-foreground">Repository</dt><dd className="text-foreground">{node.repoLabel}</dd>
        <dt className="text-muted-foreground">Next phase</dt><dd className="text-foreground">{node.nextPhase ? `${node.nextPhase.id} — ${node.nextPhase.title}` : 'Coordination only'}</dd>
        <dt className="text-muted-foreground">Blockers</dt><dd className={blockedTitles.length ? 'text-destructive' : 'text-foreground'}>{blockedTitles.join(', ') || 'None'}</dd>
        <dt className="text-muted-foreground">Edges</dt><dd className="text-foreground">{incoming} incoming · {outgoing} outgoing</dd>
        <dt className="text-muted-foreground">Tags</dt><dd className="flex flex-wrap gap-1">{node.tags.length ? node.tags.map(tag => <TagBadge key={tag} tag={tag} />) : 'None'}</dd>
      </dl>
    </section>
  );
}

function KeyRow({ keys, action }: { keys: string; action: string }) {
  return <div className="flex items-center justify-between gap-3"><dt><kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-foreground">{keys}</kbd></dt><dd className="text-right">{action}</dd></div>;
}
