import { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, Upload, Github, Gitlab, Globe } from 'lucide-react';
import { useFileSystem } from '@/hooks/useFileSystem';
import { Button } from './ui/button';
import { cn, onActivateKey } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { LoadingOverlay } from './LoadingOverlay';

interface Props {
  label?: string;
  compact?: boolean;
  cards?: boolean;
}

export function FolderPicker({ label = 'Open .wiki Folder', compact = false, cards = false }: Props) {
  const {
    openFolder, loadFileList, dropItems, loadRemote, cancelRemote, pending, confirmPending, cancelPending,
    existingProjects, loading, remoteLoading, error, scanning, setScanning, progress, nativeFolderPicker,
  } = useFileSystem();
  const [projectName, setProjectName] = useState('');
  const [remoteSpec, setRemoteSpec] = useState('');
  const [remoteRef, setRemoteRef] = useState('');
  const [remoteHistory, setRemoteHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('okf-remote-wiki-history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => { if (pending) setProjectName(''); }, [pending]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();

  // The native folder dialog gives no "files are being read" signal: the window regaining focus is the closest cue.
  const awaitingDialog = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    const onFocus = () => {
      if (!awaitingDialog.current) return;
      awaitingDialog.current = false;
      setTimeout(() => { if (!cancelled.current) setScanning(true); }, 300);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [setScanning]);

  useEffect(() => {
    const input = inputRef.current;
    const onCancel = () => { cancelled.current = true; awaitingDialog.current = false; setScanning(false); };
    input?.addEventListener('cancel', onCancel);
    return () => input?.removeEventListener('cancel', onCancel);
  }, [setScanning]);

  const overlay = <LoadingOverlay open={loading || scanning} scanning={scanning && !loading} progress={progress} onCancel={remoteLoading ? cancelRemote : undefined} />;

  const announce = (result: { plans: number; repoId: string; warnings: number } | null) => {
    if (result) {
      toast({
        title: `Loaded ${result.plans} plan${result.plans !== 1 ? 's' : ''}`,
        description: `Repo: ${result.repoId}${result.warnings ? ` · ${result.warnings} warning${result.warnings !== 1 ? 's' : ''}` : ''}`,
      });
    }
  };

  const handleRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const spec = remoteSpec.trim();
    const result = await loadRemote(remoteSpec, remoteRef);
    if (spec && !remoteHistory.includes(spec)) {
      const next = [spec, ...remoteHistory].slice(0, 20);
      setRemoteHistory(next);
      try { localStorage.setItem('okf-remote-wiki-history', JSON.stringify(next)); } catch { /* ignore */ }
    }
    if (result) { setRemoteSpec(''); setRemoteRef(''); }
    announce(result);
  };

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = remoteHistory.filter(item =>
    !remoteSpec || item.toLowerCase().includes(remoteSpec.toLowerCase()),
  );
  const remoteForm = (
    <form className="space-y-2" onSubmit={handleRemote}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={remoteSpec}
            onChange={e => setRemoteSpec(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            placeholder="GitHub owner/repo or GitLab URL"
            aria-label="GitHub owner/repo or GitLab project URL"
            autoComplete="off"
            disabled={loading}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border border-border bg-card text-sm shadow-md">
              {suggestions.map(item => {
                const lower = item.toLowerCase();
                const Icon = lower.includes('gitlab') ? Gitlab : lower.includes('github') || !lower.startsWith('http') ? Github : Globe;
                return (
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                  <li
                    key={item}
                    className="flex items-center gap-2 cursor-pointer px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={() => {
                      setRemoteSpec(item);
                      setRemoteRef('');
                      setShowSuggestions(false);
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button type="submit" size="sm" disabled={loading || !remoteSpec.trim()}>Load</Button>
      </div>
      <Input
        value={remoteRef}
        onChange={e => setRemoteRef(e.target.value)}
        placeholder="Branch/ref (optional)"
        aria-label="Branch/ref (optional)"
        autoComplete="off"
        disabled={loading}
      />
      <p className="text-xs text-muted-foreground">Branch/ref overrides the URL. For tree/blob URLs with more path segments, enter the exact branch here because slashes may belong to the branch or file path.</p>
    </form>
  );

  const handleOpen = async () => {
    if (!nativeFolderPicker && !('showDirectoryPicker' in window)) {
      toast({
        title: 'Choose a folder or Markdown files',
        description: 'Pick the project or .wiki folder. The browser reads plans, related Markdown, images, and PDFs.',
      });
      awaitingDialog.current = true;
      cancelled.current = false;
      inputRef.current?.click();
      return;
    }
    announce(await openFolder());
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    (await dropItems(e.dataTransfer.items)).forEach(announce);
  }, [dropItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameDialog = (
    <Dialog open={!!pending} onOpenChange={open => { if (!open) cancelPending(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name this project</DialogTitle>
          <DialogDescription>
            Browsers don&apos;t expose a project name for dropped Markdown files or a selected <span className="font-mono">{pending?.folderName}</span> folder.
            Enter a project name, or leave it blank for a random name like persian-diamond. Dropping the project folder itself (the one containing .wiki) names it automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async e => {
            e.preventDefault();
            announce(await confirmPending(projectName));
          }}
        >
          <Input
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- dialog's only field
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. acorn (optional)"
          />
          {existingProjects.includes(projectName.trim()) && (
            <p className="text-xs text-od-yellow">A project with this name is loaded. This folder will be added separately.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelPending}>Cancel</Button>
            <Button type="submit" size="sm">Load</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const fallbackInput = (
    <>
      {overlay}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        multiple
        onChange={async e => {
          const input = e.target;
          // Safari can dispatch change before restoring window focus. Prevent the
          // delayed focus cue from turning the scanning overlay back on afterward.
          awaitingDialog.current = false;
          cancelled.current = true;
          setScanning(false);
          announce(await loadFileList(input.files));
          input.value = '';
        }}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
      />
    </>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={handleOpen} disabled={loading}>
          <FolderOpen className="h-4 w-4 mr-2" />
          {loading ? 'Loading…' : label}
        </Button>
        {remoteForm}
        {fallbackInput}
        {nameDialog}
        {error && <p className="text-xs text-od-red">{error}</p>}
      </div>
    );
  }

  if (cards) {
    const cardClass = cn(
      'drop-zone h-[106px] px-4 text-center gap-1.5 bg-card/60 hover:border-primary/50',
      dragging && 'dragging',
    );
    const dropProps = {
      onDragOver:  (e: React.DragEvent) => { e.preventDefault(); setDragging(true); },
      onDragLeave: () => setDragging(false),
      onDrop:      handleDrop,
    };
    return (
      <div className="space-y-3">
        {fallbackInput}
        {nameDialog}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
          <div className={cardClass} role="button" tabIndex={0} onKeyDown={onActivateKey(handleOpen)} onClick={handleOpen} {...dropProps}>
            <FolderOpen className="h-5 w-5 text-od-blue" />
            <p className="text-xs font-semibold text-foreground">{loading ? 'Parsing files…' : 'Open Folder'}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              Reads plans, images, and PDFs from .wiki
            </p>
          </div>
          <div className={cardClass} role="button" tabIndex={0} onKeyDown={onActivateKey(handleOpen)} onClick={handleOpen} {...dropProps}>
            <Upload className="h-5 w-5 text-od-green" />
            <p className="text-xs font-semibold text-foreground">Drop Files</p>
            <p className="text-[10px] leading-tight text-muted-foreground">Markdown files or a project/.wiki folder</p>
          </div>
        </div>
        {remoteForm}
        {error && (
          <p className="text-xs text-od-red bg-od-red/10 border border-od-red/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fallbackInput}
      {nameDialog}
      <div
        className={cn('drop-zone p-10 text-center', dragging && 'dragging')}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={onActivateKey(handleOpen)}
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">
          {loading ? 'Parsing files…' : 'Drop Markdown files or a project/.wiki folder here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
      </div>
      {remoteForm}
      {error && (
        <p className="text-xs text-od-red bg-od-red/10 border border-od-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}






