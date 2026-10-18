import { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { useFileSystem } from '@/hooks/useFileSystem';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface Props {
  label?: string;
  compact?: boolean;
}

export function FolderPicker({ label = 'Open .wiki Folder', compact = false }: Props) {
  const {
    openFolder, loadFileList, dropFolder, pending, confirmPending, cancelPending,
    existingProjects, loading, error,
  } = useFileSystem();
  const [projectName, setProjectName] = useState('');
  useEffect(() => { if (pending) setProjectName(''); }, [pending]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();

  const announce = (result: { plans: number; repoId: string; warnings: number } | null) => {
    if (result) {
      toast({
        title: `Loaded ${result.plans} plan${result.plans !== 1 ? 's' : ''}`,
        description: `Repo: ${result.repoId}${result.warnings ? ` · ${result.warnings} warning${result.warnings !== 1 ? 's' : ''}` : ''}`,
      });
    }
  };

  const handleOpen = async () => {
    if (!('showDirectoryPicker' in window)) {
      inputRef.current?.click();
      return;
    }
    announce(await openFolder());
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    (await dropFolder(e.dataTransfer.items)).forEach(announce);
  }, [dropFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameDialog = (
    <Dialog open={!!pending} onOpenChange={open => { if (!open) cancelPending(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name this project</DialogTitle>
          <DialogDescription>
            Browsers don&apos;t expose the parent folder of <span className="font-mono">{pending?.folderName}</span>.
            Enter a project name, or leave it blank for a random name like persian-diamond. Picking the project folder itself (the one containing .wiki) names it automatically.
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
            autoFocus
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. acorn (optional)"
          />
          {existingProjects.includes(projectName.trim()) && (
            <p className="text-xs text-od-yellow">A project with this name is loaded and will be replaced.</p>
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
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      onChange={async e => {
        announce(await loadFileList(e.target.files));
        e.target.value = '';
      }}
      {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
    />
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={handleOpen} disabled={loading}>
          <FolderOpen className="h-4 w-4 mr-2" />
          {loading ? 'Loading…' : label}
        </Button>
        {fallbackInput}
        {nameDialog}
        {error && <p className="text-xs text-od-red">{error}</p>}
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
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">
          {loading ? 'Parsing files…' : 'Drop a project or .wiki folder here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
      </div>
      {error && (
        <p className="text-xs text-od-red bg-od-red/10 border border-od-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}






