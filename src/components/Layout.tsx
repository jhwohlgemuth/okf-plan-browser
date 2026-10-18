import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlanDetailPanel } from './PlanDetailPanel';
import { TooltipProvider } from './ui/tooltip';

export function Layout() {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <PlanDetailPanel />
      </div>
    </TooltipProvider>
  );
}
