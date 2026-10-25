import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, X } from 'lucide-react';
import { getAssetUrl } from '@/lib/wikiAssets';

export interface AssetTarget { repoId: string; path: string }

function useAssetUrl(target: AssetTarget, enabled = true): { url?: string; error?: string } {
  const [state, setState] = useState<{ url?: string; error?: string }>({});
  useEffect(() => {
    let active = true;
    setState({});
    if (!enabled) return () => { active = false; };
    getAssetUrl(target.repoId, target.path).then(url => {
      if (active) setState({ url });
    }, error => {
      if (active) setState({ error: (error as Error).message });
    });
    return () => { active = false; };
  }, [target.repoId, target.path, enabled]);
  return state;
}

export function AssetThumbnail({ target }: { target: AssetTarget }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const { url, error } = useAssetUrl(target, visible);
  return (
    <span ref={ref} className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-secondary/40" title={error}>
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
    </span>
  );
}

export function InlineWikiImage({ target, alt, onOpen }: { target: AssetTarget; alt: string; onOpen: () => void }) {
  const { url, error } = useAssetUrl(target);
  if (error) return <span className="md-broken-link" title={error}>{alt || target.path}</span>;
  if (!url) return <span className="text-xs text-muted-foreground">Loading image…</span>;
  return (
    <button type="button" onClick={onOpen} className="block max-w-full rounded border border-border overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open image: ${alt || target.path}`}>
      <img src={url} alt={alt} className="max-h-96 max-w-full object-contain" />
    </button>
  );
}

export function AssetViewer({ target, onClose }: { target: AssetTarget; onClose: () => void }) {
  const { url, error } = useAssetUrl(target);
  const pdf = target.path.toLowerCase().endsWith('.pdf');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], iframe');
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- modal focus trap
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={target.path} onKeyDown={handleKeyDown} className="fixed inset-0 z-[70] flex flex-col bg-background/95">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-card">
        <span className="min-w-0 truncate font-mono text-sm text-foreground" title={target.path}>{target.path}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close asset viewer" className="shrink-0 rounded p-2 hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : !url ? <p className="text-sm text-muted-foreground">Loading…</p> : pdf
          ? <iframe src={url} title={target.path} className="h-full w-full max-w-6xl bg-white rounded" />
          : <img src={url} alt={target.path} className="max-h-full max-w-full object-contain" />}
      </div>
    </div>, document.body,
  );
}
