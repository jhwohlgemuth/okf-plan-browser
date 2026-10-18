import { usePlanStore } from '@/store/planStore';
import { DependencyGraph } from '@/components/DependencyGraph';

export function GraphPage() {
  const plans = usePlanStore(s => s.plans);
  const deps  = plans.reduce((acc, p) => acc + p.dependencies.length, 0);
  const refs  = plans.reduce((acc, p) => acc + p.phaseRefs.length, 0);

  return (
    <div className="flex flex-col h-screen min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <h1 className="text-base font-semibold text-foreground">Dependency Graph</h1>
        <p className="text-xs text-muted-foreground">
          {plans.length} nodes · {deps} .md links · {refs} PA-XX cross-references
          · Scroll to zoom · Drag nodes · Click to open detail
        </p>
      </div>

      {/* Graph fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <DependencyGraph />
      </div>
    </div>
  );
}
