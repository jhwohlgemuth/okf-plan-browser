import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FallbackProps {
  error: Error;
  onReset: () => void;
}

export function ErrorFallback({ error, onReset }: FallbackProps) {
  return (
    <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-od-red" aria-hidden />
      <h1 className="text-base font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground break-words">{error.message}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onReset}>Try again</Button>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  resetKey?: unknown;
}

export class ErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    return error
      ? <ErrorFallback error={error} onReset={() => this.setState({ error: null })} />
      : this.props.children;
  }
}
