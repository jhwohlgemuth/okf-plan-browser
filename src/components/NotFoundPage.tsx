import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="font-mono text-3xl font-semibold text-od-blue">404</p>
      <h1 className="text-base font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">That address doesn't match any page in the plan browser.</p>
      <Button asChild size="sm">
        <Link to="/home">Back to home</Link>
      </Button>
    </div>
  );
}
