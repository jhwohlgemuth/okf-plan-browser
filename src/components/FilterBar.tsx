import { X } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { Button } from './ui/button';
import type { PlanStatus, PlanPriority, PlanImpact, PlanDifficulty } from '@/types/wiki';

const STATUS_OPTIONS:     PlanStatus[]     = ['planned', 'in-progress', 'waiting-on-validation', 'blocked'];
const PRIORITY_OPTIONS:   PlanPriority[]   = ['next', 'high', 'medium', 'low'];
const IMPACT_OPTIONS:     PlanImpact[]     = ['critical', 'high', 'medium', 'low'];
const DIFFICULTY_OPTIONS: PlanDifficulty[] = ['easy', 'medium', 'hard'];

function ToggleGroup<T extends string>({
  label, options, selected, onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (val: T[]) => void;
}) {
  const toggle = (v: T) =>
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">{label}</span>
      {options.map(o => (
        <button
          key={o}
          aria-pressed={selected.includes(o)}
          onClick={() => toggle(o)}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors font-medium capitalize ${
            selected.includes(o)
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function FilterBar() {
  const filters      = usePlanStore(s => s.filters);
  const setFilter    = usePlanStore(s => s.setFilter);
  const clearFilters = usePlanStore(s => s.clearFilters);
  const plans        = usePlanStore(s => s.plans);
  const repos        = usePlanStore(s => s.repos);

  // Collect all tags and packages from loaded plans
  const allTags = [...new Set(plans.flatMap(p => p.frontmatter.tags ?? []))].sort();
  const allPkgs = [...new Set(plans.flatMap(p => p.frontmatter.package ?? []))].sort();

  const hasFilters =
    filters.status.length || filters.priority.length ||
    filters.impact.length || filters.difficulty.length ||
    filters.tags.length   || filters.packages.length  ||
    filters.repos.length;

  return (
    <div className="border-b border-border bg-card px-5 py-3 space-y-2.5">
      <ToggleGroup
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.status}
        onChange={v => setFilter('status', v)}
      />
      <ToggleGroup
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priority}
        onChange={v => setFilter('priority', v)}
      />
      <ToggleGroup
        label="Impact"
        options={IMPACT_OPTIONS}
        selected={filters.impact}
        onChange={v => setFilter('impact', v)}
      />
      <ToggleGroup
        label="Difficulty"
        options={DIFFICULTY_OPTIONS}
        selected={filters.difficulty}
        onChange={v => setFilter('difficulty', v)}
      />

      {/* Repos */}
      {repos.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">Repo</span>
          {repos.map(r => {
            const active = filters.repos.includes(r.id);
            return (
              <button
                key={r.id}
                aria-pressed={active}
                onClick={() => setFilter('repos', active ? filters.repos.filter(id => id !== r.id) : [...filters.repos, r.id])}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors font-mono ${
                  active
                    ? 'border-transparent text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                style={active ? { background: r.color + '25', borderColor: r.color + '60', color: r.color } : {}}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tags (if any loaded) */}
      {allTags.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground font-medium w-16 shrink-0 pt-1">Tags</span>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto flex-1 min-w-0">
            {allTags.map(t => {
              const active = filters.tags.includes(t);
              return (
                <button
                  key={t}
                  aria-pressed={active}
                  onClick={() => setFilter('tags', active ? filters.tags.filter(x => x !== t) : [...filters.tags, t])}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    active ? 'bg-accent text-accent-foreground border-border' : 'text-muted-foreground border-border/50 hover:border-border'
                  }`}
                >
                  #{t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Packages (if any loaded) */}
      {allPkgs.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground font-medium w-16 shrink-0 pt-1">Packages</span>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto flex-1 min-w-0">
            {allPkgs.map(pkg => {
              const active = filters.packages.includes(pkg);
              return (
                <button
                  key={pkg}
                  aria-pressed={active}
                  onClick={() => setFilter('packages', active ? filters.packages.filter(x => x !== pkg) : [...filters.packages, pkg])}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors font-mono ${
                    active ? 'bg-accent text-accent-foreground border-border' : 'text-muted-foreground border-border/50 hover:border-border'
                  }`}
                >
                  {pkg}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear */}
      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-muted-foreground">
          <X className="h-3 w-3 mr-1" /> Clear filters
        </Button>
      ) : null}
    </div>
  );
}

