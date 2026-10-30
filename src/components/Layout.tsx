import { useEffect, useRef, useState, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { ErrorBoundary } from './ErrorFallback';
import { RouteFallback } from './RouteFallback';
import { Sidebar } from './Sidebar';
import { PlanDetailPanel } from './PlanDetailPanel';
import { TooltipProvider } from './ui/tooltip';
import { usePlanStore } from '@/store/planStore';
import { WalkthroughProvider } from './Walkthrough';

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const mobileHomeRef = useRef<HTMLAnchorElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const syncPlanSelection = usePlanStore(s => s.syncPlanSelection);
  const syncingFromUrl = useRef(false);
  const { pathname } = location;
  const routePlanId = new URLSearchParams(location.search).get('plan');
  const routeAnchor = (() => {
    if (!routePlanId || !location.hash) return null;
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return location.hash.slice(1); }
  })();

  useEffect(() => { setNavOpen(false); }, [pathname]);
  useEffect(() => {
    syncingFromUrl.current = true;
    syncPlanSelection(routePlanId, routeAnchor);
    syncingFromUrl.current = false;
  }, [location.hash, location.search, routeAnchor, routePlanId, syncPlanSelection]);

  useEffect(() => {
    const syncFromHistory = () => {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('plan');
      let anchor: string | null = null;
      if (id && url.hash) {
        try { anchor = decodeURIComponent(url.hash.slice(1)); } catch { anchor = url.hash.slice(1); }
      }
      syncingFromUrl.current = true;
      syncPlanSelection(id, anchor);
      syncingFromUrl.current = false;
    };
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, [syncPlanSelection]);

  useEffect(() => {
    return usePlanStore.subscribe((state, previous) => {
      if (syncingFromUrl.current) return;
      if (state.selectedPlanId === previous.selectedPlanId && state.selectedAnchor === previous.selectedAnchor) return;
      const search = new URLSearchParams(location.search);
      if (state.selectedPlanId) search.set('plan', state.selectedPlanId);
      else search.delete('plan');
      const query = search.toString();
      navigate({
        pathname: location.pathname,
        search: query ? `?${query}` : '',
        hash: state.selectedPlanId && state.selectedAnchor ? `#${encodeURIComponent(state.selectedAnchor)}` : '',
      });
    });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) setNavOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <WalkthroughProvider>
    <TooltipProvider>
      <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
        <div className="flex h-dvh overflow-hidden bg-background">
          {isDesktop && <Sidebar variant="desktop" />}
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="md:hidden flex items-center gap-3 px-3 py-2 border-b border-border bg-card shrink-0">
              <DialogPrimitive.Trigger asChild>
                <button
                  type="button"
                  data-tour="navigation-trigger"
                  aria-label="Open navigation"
                  className="p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </DialogPrimitive.Trigger>
              <span className="text-od-blue font-mono font-semibold">OKF</span>
              <span className="text-foreground font-semibold text-sm">Plan Browser</span>
            </header>
            <main className="flex-1 min-h-0 overflow-y-auto">
              <ErrorBoundary resetKey={pathname}>
                <Suspense fallback={<RouteFallback />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
          <PlanDetailPanel />
          {!isDesktop && (
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-30 bg-black/50 md:hidden" />
              <DialogPrimitive.Content
                className="fixed inset-y-0 left-0 z-40 h-dvh w-[220px] bg-card shadow-xl outline-none md:hidden"
                onOpenAutoFocus={event => {
                  event.preventDefault();
                  mobileHomeRef.current?.focus();
                }}
              >
                <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Navigate between Plan Browser pages and repositories.
                </DialogPrimitive.Description>
                <Sidebar variant="mobile" homeRef={mobileHomeRef} onNavigate={() => setNavOpen(false)} />
                <DialogPrimitive.Close
                  aria-label="Close navigation"
                  className="absolute right-2 top-2 rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </div>
      </DialogPrimitive.Root>
    </TooltipProvider>
    </WalkthroughProvider>
  );
}
