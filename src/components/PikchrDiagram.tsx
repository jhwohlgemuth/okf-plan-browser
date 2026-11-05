import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssetText } from '@/lib/wikiAssets';
import { renderPikchr } from '@/lib/pikchr';
import type { AssetTarget } from './AssetViewer';

function useDarkMode(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

interface DiagramProps {
  source: string;
  alt: string;
  compact?: boolean;
  className?: string;
}

export function PikchrDiagram({ source, alt, compact = false, className }: DiagramProps) {
  const dark = useDarkMode();
  const [state, setState] = useState<{ url?: string; error?: string }>({});

  useEffect(() => {
    let active = true;
    let url: string | undefined;
    setState({});
    renderPikchr(source, dark).then(svg => {
      if (!active) return;
      url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      setState({ url });
    }, error => {
      if (active) setState({ error: (error as Error).message });
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, dark]);

  if (state.error) {
    if (compact) return <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Pikchr rendering failed" />;
    return (
      <div role="alert" className="w-full rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        <p className="font-semibold">Could not render Pikchr diagram</p>
        <p className="mt-1 whitespace-pre-wrap font-mono">{state.error}</p>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-muted-foreground">{source}</pre>
      </div>
    );
  }
  if (!state.url) {
    return <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />Rendering Pikchr…</span>;
  }
  return <img src={state.url} alt={alt} data-pikchr-diagram className={cn('max-h-full max-w-full object-contain', className)} />;
}

interface AssetDiagramProps extends Omit<DiagramProps, 'source'> {
  target: AssetTarget;
  enabled?: boolean;
}

export function PikchrAssetDiagram({ target, enabled = true, ...props }: AssetDiagramProps) {
  const [state, setState] = useState<{ source?: string; error?: string }>({});
  useEffect(() => {
    let active = true;
    setState({});
    if (!enabled) return () => { active = false; };
    getAssetText(target.repoId, target.path).then(source => {
      if (active) setState({ source });
    }, error => {
      if (active) setState({ error: (error as Error).message });
    });
    return () => { active = false; };
  }, [target.repoId, target.path, enabled]);

  if (!enabled || (state.source === undefined && !state.error)) {
    return <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />Loading Pikchr…</span>;
  }
  if (state.error) {
    return props.compact
      ? <AlertTriangle className="h-5 w-5 text-destructive" aria-label="Pikchr asset loading failed" />
      : <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  }
  return <PikchrDiagram source={state.source ?? ''} {...props} />;
}
