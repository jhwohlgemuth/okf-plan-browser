import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, LayoutGrid, Layers, Share2, Search, Settings, AlertTriangle, Info, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/store/planStore';
import { useRefresh } from '@/hooks/useRefresh';

const NAV = [
  { to: '/home',      icon: Home,        label: 'Home' },
  { to: '/portfolio', icon: LayoutGrid,  label: 'Portfolio' },
  { to: '/phases',    icon: Layers,      label: 'Phase Tracker' },
  { to: '/graph',     icon: Share2,      label: 'Dependency Graph' },
  { to: '/search',    icon: Search,      label: 'Search' },
  { to: '/settings',  icon: Settings,    label: 'Settings' },
  { to: '/about',     icon: Info,        label: 'About' },
];

export function Sidebar({ open = false }: { open?: boolean }) {
  const location   = useLocation();
  const plans      = usePlanStore(s => s.plans);
  const repos      = usePlanStore(s => s.repos);
  const warnings   = usePlanStore(s => s.warnings);
  const isDemoData = usePlanStore(s => s.isDemoData);
  const { busy, refreshable, refreshOne, refreshAll } = useRefresh();
  return (
    <aside className={cn('w-[220px] shrink-0 flex flex-col h-dvh bg-card border-r border-border', 'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:transition-transform', !open && 'max-md:-translate-x-full')}>
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-od-blue font-mono text-lg font-semibold">OKF</span>
          <span className="text-foreground font-semibold text-sm">Plan Browser</span>
        </div>
        <p className="text-muted-foreground text-xs mt-0.5">
          {plans.length} plan{plans.length !== 1 ? 's' : ''} · {repos.length} repo{repos.length !== 1 ? 's' : ''}
          {isDemoData && <span className="ml-1 text-od-yellow">(demo)</span>}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === 'Settings' && warnings.length > 0 && (
                <span className="ml-auto flex items-center gap-1 text-od-orange text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {warnings.length}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Repo colour pills */}
      {repos.length > 0 && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-1.5 max-h-[40%] overflow-y-auto">
          <div className="flex items-center mb-2">
            <p className="text-xs text-muted-foreground font-medium">Repos</p>
            {!isDemoData && (
              <button
                type="button"
                onClick={refreshAll}
                disabled={busy.size > 0}
                title="Refresh all wikis"
                aria-label="Refresh all wikis"
                className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <RefreshCw className={cn('h-3 w-3', busy.size > 0 && 'animate-spin')} />
                Refresh all
              </button>
            )}
          </div>
          {repos.map(r => (
            <div key={r.id} className="group flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="truncate font-mono">{r.label}</span>
              <span className="ml-auto text-od-muted">{r.planCount}</span>
              {!isDemoData && (
                <button
                  type="button"
                  onClick={() => refreshOne(r.id)}
                  disabled={busy.has(r.id)}
                  title={refreshable.has(r.id) ? `Refresh ${r.label}` : `Re-select the ${r.label} folder to refresh`}
                  aria-label={`Refresh ${r.label}`}
                  className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-accent hover:text-foreground disabled:pointer-events-none transition"
                >
                  <RefreshCw className={cn('h-3 w-3', busy.has(r.id) && 'animate-spin')} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
