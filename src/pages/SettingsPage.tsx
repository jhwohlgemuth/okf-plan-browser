import { Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { usePlanStore, PLAN_STORAGE_KEY } from '@/store/planStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'dark',   label: 'Dark (One Dark)', icon: Moon },
  { value: 'light',  label: 'Light',           icon: Sun },
  { value: 'system', label: 'System',          icon: Monitor },
];

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { warnings, clearAll, clearSavedData, removeRepo, repos, plans, isDemoData, storageError } = usePlanStore();
  const savedBytes = (() => {
    try { return (localStorage.getItem(PLAN_STORAGE_KEY) ?? '').length * 2; } catch { return 0; }
  })();
  const fmtSize = (b: number) => 
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;
  const { toast } = useToast();

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Appearance, data management, and app info.</p>
      </div>

      {/* Theme */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Theme</h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-xs font-medium transition-colors',
                theme === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Loaded Data</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plans loaded</span>
            <span className="font-mono text-foreground">{plans.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Repos</span>
            <span className="font-mono text-foreground">{repos.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parse warnings</span>
            <span className={cn('font-mono', warnings.length > 0 ? 'text-od-orange' : 'text-foreground')}>
              {warnings.length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saved in browser</span>
            <span className="font-mono text-foreground">{isDemoData ? 'demo (not saved)' : fmtSize(savedBytes)}</span>
          </div>
          {storageError && (
            <p className="text-xs text-od-red bg-od-red/10 border border-od-red/20 rounded-md px-3 py-2">
              Browser storage is full or unavailable — your wikis will not survive a refresh.
            </p>
          )}

          {repos.length > 0 && (
            <ul className="divide-y divide-border border border-border rounded-lg">
              {repos.map(r => (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs text-foreground truncate">{r.label}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground truncate">{r.uuid ?? 'demo'}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{r.planCount}</span>
                  <button
                    className="p-1 text-muted-foreground hover:text-od-red transition-colors"
                    title="Remove this wiki"
                    onClick={() => { removeRepo(r.id); toast({ title: `Removed ${r.label}` }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={plans.length === 0}
              onClick={() => { clearAll(); toast({ title: 'Cleared loaded wikis' }); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear loaded
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-od-red border-od-red/30 hover:bg-od-red/10"
              onClick={() => { clearSavedData(); toast({ title: 'Cleared loaded wikis and saved browser data' }); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear saved data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Wikis are saved in this browser&apos;s localStorage. &quot;Clear saved data&quot; removes them from storage too.
          </p>        </div>
      </section>

      {/* Warnings detail */}
      {warnings.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Parse Warnings
          </h2>
          <div className="bg-od-yellow/10 border border-od-yellow/30 rounded-xl p-4 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="text-xs">
                <span className="font-mono text-od-yellow">{w.repoId}/{w.fileName}</span>
                <ul className="text-muted-foreground mt-0.5 space-y-0.5 pl-3">
                  {w.errors.map((e, j) => <li key={j}>• {e}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-1.5 text-xs text-muted-foreground">
          <p><span className="text-foreground font-medium">OKF Plan Browser</span> — v1.0.0</p>
          <p>Parses <span className="font-mono">.wiki/</span> markdown planning portfolios client-side. No data leaves your machine.</p>
          <p>Stack: React 18 · Vite 5 · shadcn/ui · Tailwind · D3 · Zustand · Framer Motion</p>
          <p className="pt-2 border-t border-border">
            <a
              href="https://github.com/YOUR_USERNAME/okf-plan-browser"
              target="_blank"
              rel="noopener noreferrer"
              className="text-od-blue hover:underline"
            >
              GitHub →
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

