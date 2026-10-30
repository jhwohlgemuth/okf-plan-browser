import { useEffect, useState } from 'react';
import { KeyRound, Monitor, Moon, ShieldAlert, Sun, Trash2 } from 'lucide-react';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { usePlanStore, PLAN_STORAGE_KEY } from '@/store/planStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  canStoreForgeTokens, clearForgeTokens, hasGithubToken, hasGitlabToken,
  normalizeGitlabHost, setGithubToken, setGitlabToken,
} from '@/lib/githubToken';

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'dark',   label: 'Dark (One Dark)', icon: Moon },
  { value: 'light',  label: 'Light',           icon: Sun },
  { value: 'system', label: 'System',          icon: Monitor },
];

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const warnings       = usePlanStore(s => s.warnings);
  const clearAll       = usePlanStore(s => s.clearAll);
  const clearSavedData = usePlanStore(s => s.clearSavedData);
  const removeRepo     = usePlanStore(s => s.removeRepo);
  const repos          = usePlanStore(s => s.repos);
  const plans          = usePlanStore(s => s.plans);
  const isDemoData     = usePlanStore(s => s.isDemoData);
  const storageError   = usePlanStore(s => s.storageError);
  const savedBytes = (() => {
    try { return (localStorage.getItem(PLAN_STORAGE_KEY) ?? '').length * 2; } catch { return 0; }
  })();
  const fmtSize = (b: number) => 
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;
  const { toast } = useToast();
  const [githubToken, setGithubTokenField] = useState('');
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [gitlabHost, setGitlabHost] = useState('gitlab.com');
  const [gitlabToken, setGitlabTokenField] = useState('');
  const [gitlabConfigured, setGitlabConfigured] = useState(false);
  const [credentialBusy, setCredentialBusy] = useState(false);
  const tokenStorageAvailable = canStoreForgeTokens();

  useEffect(() => {
    let live = true;
    hasGithubToken().then(value => { if (live) setGithubConfigured(value); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      try {
        const host = normalizeGitlabHost(gitlabHost);
        hasGitlabToken(host).then(value => { if (live) setGitlabConfigured(value); }).catch(() => {
          if (live) setGitlabConfigured(false);
        });
      } catch {
        setGitlabConfigured(false);
      }
    }, 200);
    return () => { live = false; window.clearTimeout(timer); };
  }, [gitlabHost]);

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Appearance, data management, and app info.</p>
      </div>

      {/* Theme */}
      <section data-tour="settings-theme">
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

      {/* GitHub token */}
      <section data-tour="settings-github-token">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">GitHub</h2>
        {!tokenStorageAvailable ? (
          <div className="flex gap-2 rounded-xl border border-od-red/30 bg-od-red/10 p-4 text-xs text-od-red">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Tokens are disabled because this page is not using a secure HTTPS connection.
          </div>
        ) : (
          <form
            className="bg-card border border-border rounded-xl p-4 space-y-3"
            onSubmit={async e => {
              e.preventDefault();
              if (!githubToken.trim()) return;
              setCredentialBusy(true);
              try {
                await setGithubToken(githubToken);
                setGithubTokenField('');
                setGithubConfigured(true);
                toast({ title: 'GitHub token configured' });
              } catch (error) {
                toast({ title: 'Could not save GitHub token', description: (error as Error).message });
              } finally {
                setCredentialBusy(false);
              }
            }}
          >
            <p className="text-xs text-muted-foreground">
              Use an expiring fine-grained token limited to the required repositories with <span className="font-mono">Contents: read</span>.
              Web tokens last only for this tab. The desktop app uses the operating system credential store.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5" /> {githubConfigured ? 'A token is configured.' : 'No token configured.'}
            </p>
            <Input
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={githubToken}
              onChange={e => setGithubTokenField(e.target.value)}
              placeholder="github_pat_…"
              aria-label="GitHub personal access token"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="outline" disabled={credentialBusy || !githubToken.trim()}>Save token</Button>
              {githubConfigured && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={credentialBusy}
                  onClick={async () => {
                    setCredentialBusy(true);
                    try {
                      await setGithubToken('');
                      setGithubConfigured(false);
                      toast({ title: 'GitHub token forgotten' });
                    } catch (error) {
                      toast({ title: 'Could not forget GitHub token', description: (error as Error).message });
                    } finally {
                      setCredentialBusy(false);
                    }
                  }}
                >
                  Forget
                </Button>
              )}
            </div>
          </form>
        )}
      </section>

      <section data-tour="settings-gitlab-token">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">GitLab</h2>
        {!tokenStorageAvailable ? (
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            GitLab tokens are unavailable until the app is loaded over HTTPS.
          </div>
        ) : (
          <form
            className="bg-card border border-border rounded-xl p-4 space-y-3"
            onSubmit={async e => {
              e.preventDefault();
              if (!gitlabToken.trim()) return;
              setCredentialBusy(true);
              try {
                const host = normalizeGitlabHost(gitlabHost);
                await setGitlabToken(host, gitlabToken);
                setGitlabHost(host);
                setGitlabTokenField('');
                setGitlabConfigured(true);
                toast({ title: `GitLab token configured for ${host}` });
              } catch (error) {
                toast({ title: 'Could not save GitLab token', description: (error as Error).message });
              } finally {
                setCredentialBusy(false);
              }
            }}
          >
            <p className="text-xs text-muted-foreground">
              Tokens are isolated by exact host. Prefer an expiring project token, or a personal token with only <span className="font-mono">read_repository</span>.
            </p>
            <Input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={gitlabHost}
              onChange={e => setGitlabHost(e.target.value)}
              placeholder="gitlab.com"
              aria-label="GitLab host"
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5" /> {gitlabConfigured ? 'A token is configured for this exact host.' : 'No token configured for this host.'}
            </p>
            <Input
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={gitlabToken}
              onChange={e => setGitlabTokenField(e.target.value)}
              placeholder="glpat-…"
              aria-label="GitLab personal access token"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="outline" disabled={credentialBusy || !gitlabToken.trim()}>Save token</Button>
              {gitlabConfigured && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={credentialBusy}
                  onClick={async () => {
                    setCredentialBusy(true);
                    try {
                      const host = normalizeGitlabHost(gitlabHost);
                      await setGitlabToken(host, '');
                      setGitlabConfigured(false);
                      toast({ title: `GitLab token forgotten for ${host}` });
                    } catch (error) {
                      toast({ title: 'Could not forget GitLab token', description: (error as Error).message });
                    } finally {
                      setCredentialBusy(false);
                    }
                  }}
                >
                  Forget
                </Button>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Data */}
      <section data-tour="settings-data">
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
                    data-tour="remove-wiki"
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
              data-tour="clear-loaded"
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
              data-tour="clear-saved"
              variant="outline"
              size="sm"
              className="flex-1 text-od-red border-od-red/30 hover:bg-od-red/10"
              onClick={async () => {
                setCredentialBusy(true);
                clearSavedData();
                try {
                  await clearForgeTokens();
                  setGithubConfigured(false);
                  setGitlabConfigured(false);
                  setGithubTokenField('');
                  setGitlabTokenField('');
                  toast({ title: 'Cleared saved wikis and forgot all credentials' });
                } catch (error) {
                  toast({
                    title: 'Cleared saved wikis, but some credentials remain',
                    description: (error as Error).message,
                  });
                } finally {
                  setCredentialBusy(false);
                }
              }}
              disabled={credentialBusy}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear saved data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            &quot;Clear saved data&quot; removes persisted wikis and all configured forge credentials.
          </p>
        </div>
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
          <p><span className="text-foreground font-medium">OKF Plan Browser</span> — v{__APP_VERSION__}</p>
          <p>Parses <span className="font-mono">.wiki/</span> markdown planning portfolios in the browser. Local folders never leave this machine; remote loads fetch from GitHub or GitLab.</p>
          <p>Stack: React 18 · Vite 6 · shadcn/ui · Tailwind · D3 · Zustand</p>
          <p className="pt-2 border-t border-border">
            <a
              href="https://github.com/jhwohlgemuth/okf-plan-browser"
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

