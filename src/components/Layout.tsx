import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { PlanDetailPanel } from './PlanDetailPanel';
import { TooltipProvider } from './ui/tooltip';

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setNavOpen(false); }, [pathname]);

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        {navOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setNavOpen(false)} />
        )}
        <Sidebar open={navOpen} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="md:hidden flex items-center gap-3 px-3 py-2 border-b border-border bg-card shrink-0">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              className="p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-od-blue font-mono font-semibold">OKF</span>
            <span className="text-foreground font-semibold text-sm">Plan Browser</span>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto">
            <Outlet />
          </main>
        </div>
        <PlanDetailPanel />
      </div>
    </TooltipProvider>
  );
}
