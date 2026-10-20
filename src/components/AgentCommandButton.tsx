import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  command: string;
  label: string;
  className?: string;
  successTitle?: string;
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through for browsers that expose Clipboard but deny the call.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Clipboard access is unavailable.');
  } finally {
    textarea.remove();
  }
}

export function AgentCommandButton({ command, label, className, successTitle = 'Agent command copied' }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await copyText(command);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
      toast({ title: successTitle });
    } catch (error) {
      toast({ title: 'Could not copy agent command', description: (error as Error).message });
    }
  };

  const isolateKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={copy}
      onKeyDown={isolateKey}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-od-green" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

