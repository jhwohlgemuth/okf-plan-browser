import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, FolderOpen } from 'lucide-react';
import type { LoadProgress } from '@/hooks/useFileSystem';

const MESSAGES = [
  'Rummaging through folders…',
  'Convincing files to line up…',
  'Teaching the parser some manners…',
  'Counting phases (twice)…',
  'Herding markdown…',
  'Almost there, probably…',
];

const FLYERS = [
  { fx: '-46px', fr: '-25deg', delay: '0s',    color: 'text-od-blue' },
  { fx: '38px',  fr: '20deg',  delay: '0.5s',  color: 'text-od-green' },
  { fx: '-14px', fr: '35deg',  delay: '1s',    color: 'text-od-yellow' },
];

interface Props {
  onCancel?: () => void;
  open: boolean;
  scanning: boolean;
  progress: LoadProgress | null;
}

export function LoadingOverlay({ open, scanning, progress, onCancel }: Props) {
  const [msg, setMsg] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setMsg(m => (m + 1) % MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const determinate = progress?.total != null && progress.total > 0;
  const pct = determinate ? Math.min(100, Math.round((progress!.done / progress!.total!) * 100)) : 0;
  const status = scanning
    ? 'Your browser is reading the folder. Big projects can take a while, and the page may stall.'
    : determinate
      ? `Parsed ${progress!.done} of ${progress!.total} markdown files`
      : progress
        ? `Read ${progress.done} markdown file${progress.done !== 1 ? 's' : ''}`
        : 'Starting…';

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="relative mx-auto mb-5 h-24 w-24">
          {FLYERS.map((f, i) => (
            <FileText
              key={i}
              className={`okf-fly absolute left-1/2 top-2 -ml-2.5 h-5 w-5 ${f.color}`}
              style={{ ['--fx' as string]: f.fx, ['--fr' as string]: f.fr, animationDelay: f.delay }}
            />
          ))}
          <FolderOpen className="okf-hop absolute bottom-0 left-1/2 -ml-8 h-16 w-16 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground min-h-5">{MESSAGES[msg]}</p>
        <p className="mt-1 text-xs text-muted-foreground">{status}</p>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-muted">
          {determinate ? (
            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
          ) : (
            <div className="okf-sweep absolute inset-y-0 left-0 w-1/4 rounded-full bg-primary" />
          )}
        </div>
        {onCancel && <button type="button" className="mt-4 text-sm underline" onClick={onCancel}>Cancel remote load</button>}
        {determinate && <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">{pct}%</p>}
      </div>
    </div>,
    document.body,
  );
}
