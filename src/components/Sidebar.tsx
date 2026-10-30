import { NavLink, useLocation } from 'react-router-dom';
import type { Ref } from 'react';
import {
  Home, LayoutGrid, Layers, Share2, Search, Settings, AlertTriangle, Info, RefreshCw,
  PanelLeftClose, PanelLeftOpen, BookOpenCheck, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/store/planStore';
import { useUiStore } from '@/store/uiStore';
import { useRefresh } from '@/hooks/useRefresh';
import { formatPlanCounts } from '@/lib/planKind';

const NAV = [
  { to: '/home',      icon: Home,        label: 'Home' },
  { to: '/portfolio', icon: LayoutGrid,  label: 'Portfolio' },
  { to: '/phases',    icon: Layers,      label: 'Phase Tracker' },
  { to: '/graph',     icon: Share2,      label: 'Dependency Graph' },
  { to: '/search',    icon: Search,      label: 'Search' },
  { to: '/planning',  icon: BookOpenCheck, label: 'Planning Skill' },
  { to: '/settings',  icon: Settings,    label: 'Settings' },
  { to: '/about',     icon: Info,        label: 'About' },
];

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  homeRef?: Ref<HTMLAnchorElement>;
  onNavigate?: () => void;
}

export function Sidebar({ variant = 'desktop', homeRef, onNavigate }: SidebarProps) {
  const location   = useLocation();
  const plans      = usePlanStore(s => s.plans);
  const repos      = usePlanStore(s => s.repos);
  const warnings   = usePlanStore(s => s.warnings);
  const isDemoData = usePlanStore(s => s.isDemoData);
  const { busy, refreshable, refreshOne, refreshAll, cancelRefresh } = useRefresh();
  const collapsed = useUiStore(s => s.sidebarCollapsed);
  const toggleSidebar = useUiStore(s => s.toggleSidebar);
  const isDesktop = variant === 'desktop';
  const hideLabel = isDesktop && collapsed ? 'md:hidden' : '';
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <aside
      aria-label="Primary navigation"
      className={cn(
        'w-[220px] shrink-0 flex-col h-dvh bg-card border-r border-border',
        isDesktop ? 'hidden md:flex transition-[width] duration-200' : 'flex w-full',
        isDesktop && collapsed && 'md:w-14',
      )}
    >
      {/* Brand */}
      <div className={cn('px-4 pt-5 pb-4 border-b border-border', collapsed && 'md:px-2')}>
        <div className={cn('flex items-center gap-2', collapsed && 'md:flex-col md:gap-3')}>
          <span className="text-od-blue font-mono text-lg font-semibold">OKF</span>
          <span className={cn('text-foreground font-semibold text-sm', hideLabel)}>Plan Browser</span>
          {isDesktop && (
            <button
              type="button"
              data-tour="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn('ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors', collapsed && 'md:ml-0')}
            >
              <ToggleIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className={cn('text-muted-foreground text-xs mt-0.5', hideLabel)}>
          {formatPlanCounts(plans)} · {repos.length} repo{repos.length !== 1 ? 's' : ''}
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
              ref={label === 'Home' ? homeRef : undefined}
              to={to}
              onClick={onNavigate}
              title={isDesktop && collapsed ? label : undefined}
              aria-label={label}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                collapsed && 'md:justify-center md:px-0',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={hideLabel}>{label}</span>
              {label === 'Settings' && warnings.length > 0 && (
                <span className={cn('ml-auto flex items-center gap-1 text-od-orange text-xs', hideLabel)}>
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
        <div data-tour="sidebar-repos" className={cn('px-4 pb-4 border-t border-border pt-3 space-y-1.5 max-h-[40%] overflow-y-auto', hideLabel)}>
          <div className="flex items-center mb-2">
            <p className="text-xs text-muted-foreground font-medium">Repos</p>
            {!isDemoData && (
              <button
                type="button"
                onClick={refreshAll}
                disabled={repos.every(repo => busy.has(repo.id))}
                title="Refresh all wikis"
                aria-label="Refresh all wikis"
                className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <RefreshCw className={cn('h-3 w-3', busy.size > 0 && 'animate-spin')} />
                Refresh all
              </button>
            )}
          </div>
          {busy.size > 0 && (
            <button type="button" onClick={() => cancelRefresh()} className="text-xs underline">
              Cancel all refreshes
            </button>
          )}
          {repos.map(r => (
            <div key={r.id} className="group flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="truncate font-mono">{r.label}</span>
              <span className="ml-auto text-od-muted">{r.planCount}</span>
              {!isDemoData && (
                <button
                  type="button"
                  onClick={() => busy.has(r.id) ? cancelRefresh(r.id) : refreshOne(r.id)}
                  title={busy.has(r.id)
                    ? `Cancel refresh ${r.label}`
                    : refreshable.has(r.id) ? `Refresh ${r.label}` : `Re-select the ${r.label} folder to refresh`}
                  aria-label={busy.has(r.id) ? `Cancel refresh ${r.label}` : `Refresh ${r.label}`}
                  className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-accent hover:text-foreground transition"
                >
                  {busy.has(r.id) ? <X className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
