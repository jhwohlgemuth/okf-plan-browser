import { Loader2 } from 'lucide-react';

export function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="flex h-full min-h-[40vh] items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
