import { useState } from 'react';
import { usePlanStore } from '@/store/planStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useWalkthrough } from './Walkthrough';
import { Compass } from 'lucide-react';

export function WalkthroughButton({ className, prominent = false }: { className?: string; prominent?: boolean }) {
  const [demoPrompt, setDemoPrompt] = useState(false);
  const hasPlans = usePlanStore(state => state.plans.length > 0);
  const loadDemoData = usePlanStore(state => state.loadDemoData);
  const tourCompleted = useUiStore(state => state.tourCompleted);
  const { start } = useWalkthrough();

  return <>
    <Button
      variant={prominent && !tourCompleted ? 'default' : 'outline'}
      size={prominent ? 'default' : 'sm'}
      className={prominent
        ? tourCompleted
          ? `gap-2 border-primary/25 text-muted-foreground hover:text-foreground ${className ?? ''}`
          : `gap-2 font-semibold shadow-lg shadow-primary/20 ${className ?? ''}`
        : className}
      onClick={() => hasPlans ? start() : setDemoPrompt(true)}
    >
      {prominent && <Compass className="h-4 w-4" aria-hidden="true" />}
      Take a tour
    </Button>
    <Dialog open={demoPrompt} onOpenChange={setDemoPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Explore with demo plans?</DialogTitle>
          <DialogDescription>The walkthrough will load synthetic plans. Demo data is not saved, and you can clear it from Home or Settings.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDemoPrompt(false)}>Cancel</Button>
          <Button onClick={() => { setDemoPrompt(false); loadDemoData(); start(); }}>Load demo data and start</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
