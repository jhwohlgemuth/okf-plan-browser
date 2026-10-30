import { TimeRemaining } from '@/components/TimeRemaining';
import { usePlanStore } from '@/store/planStore';
import { DependencyGraph } from '@/components/DependencyGraph';
import { buildPlanEdges } from '@/lib/planLinks';

export function GraphPage() {
  const plans = usePlanStore(s => s.plans);
  const selectPlan = usePlanStore(s => s.selectPlan);
  const edges = buildPlanEdges(plans);
  const planTitles = new Map(plans.map(plan => [plan.id, plan.frontmatter.title]));
  const deps = edges.filter(edge => edge.type === 'dep').length;
  const refs = edges.filter(edge => edge.type === 'ref').length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <h1 className="text-base font-semibold text-foreground">Dependency Graph</h1>
        <p className="text-xs text-muted-foreground">
          {plans.length} nodes · {deps} .md links · {refs} PA-XX cross-references
          {' · '}<TimeRemaining plans={plans} />
          · Use controls or scroll to zoom · Drag nodes · Select to open detail
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto lg:flex">
        <div className="min-h-[500px] flex-1 overflow-hidden" data-tour="dependency-graph">
          <DependencyGraph />
        </div>
        <section
          data-tour="graph-relationships"
          aria-labelledby="resolved-relationships-title"
          className="shrink-0 border-t border-border bg-card/80 p-4 text-foreground lg:w-80 lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <h2 id="resolved-relationships-title" className="text-sm font-semibold">
            Resolved relationships
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Dependencies and unambiguous plan or phase references.
          </p>
          <div
            role="note"
            aria-labelledby="keyboard-controls-title"
            className="mt-4 rounded-lg border border-border bg-background/70 p-3"
          >
            <h3 id="keyboard-controls-title" className="text-xs font-semibold text-foreground">
              Keyboard controls
            </h3>
            <dl className="mt-2 space-y-2 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-foreground">Tab</kbd>
                  <span>/</span>
                  <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-foreground">Shift+Tab</kbd>
                </dt>
                <dd className="text-right">Move focus</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-foreground">Enter</kbd>
                  <span>/</span>
                  <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-foreground">Space</kbd>
                </dt>
                <dd className="text-right">Open or activate</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>
                  <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-foreground">Escape</kbd>
                </dt>
                <dd className="text-right">Close navigation or details</dd>
              </div>
            </dl>
          </div>
          {edges.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              No resolved dependencies or references.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {edges.map(edge => {
                const source = planTitles.get(edge.source) ?? edge.source;
                const target = planTitles.get(edge.target) ?? edge.target;
                const relationship = edge.type === 'dep' ? 'depends on' : 'references';
                return (
                  <li key={`${edge.source}\n${edge.target}`}>
                    <button
                      type="button"
                      onClick={() => selectPlan(edge.target)}
                      aria-label={`Open ${target}; ${source} ${relationship} ${target}`}
                      className="w-full rounded-lg border border-border bg-background/70 p-3 text-left text-xs hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block font-medium text-foreground">{source}</span>
                      <span className="my-1 block text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {relationship}
                      </span>
                      <span className="block text-muted-foreground">{target}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
