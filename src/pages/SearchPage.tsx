import { TimeRemaining } from '@/components/TimeRemaining';
import { useState, useMemo, useEffect } from 'react';
import { FileText, Search } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { truncate } from '@/lib/utils';
import type { ParsedPlan } from '@/types/wiki';
import { AssetThumbnail, AssetViewer, type AssetTarget } from '@/components/AssetViewer';

interface Hit {
  plan:    ParsedPlan;
  matches: string[];
}

function planMatchesTerm(plan: ParsedPlan, term: string, matches: string[]) {
  const fm = plan.frontmatter;
  if (fm.title?.toLowerCase().includes(term))       matches.push(`Title: ${fm.title}`);
  if (fm.description?.toLowerCase().includes(term)) matches.push(`Description: ${truncate(fm.description, 100)}`);
  if (fm.tags?.some(t => t.toLowerCase().includes(term))) matches.push(`Tags: ${fm.tags!.filter(t => t.toLowerCase().includes(term)).join(', ')}`);
  if (fm.package?.some(p => p.toLowerCase().includes(term))) matches.push(`Package: ${fm.package!.filter(p => p.toLowerCase().includes(term)).join(', ')}`);

  for (const section of plan.sections) {
    if (section.heading.toLowerCase().includes(term)) {
      matches.push(`Section: ${section.heading}`);
    }
    for (const phase of section.phases) {
      if (phase.title.toLowerCase().includes(term)) {
        matches.push(`${/^phase\b/i.test(phase.id) ? '' : 'Phase '}${phase.id}: ${truncate(phase.title, 80)}`);
      }
      if (phase.rawBody.toLowerCase().includes(term)) {
        const idx = phase.rawBody.toLowerCase().indexOf(term);
        const snippet = phase.rawBody.slice(Math.max(0, idx - 30), idx + 80).trim();
        if (!matches.some(m => m.includes(snippet.slice(0, 20)))) {
          matches.push(`…${snippet}…`);
        }
      }
    }
    if (section.body.toLowerCase().includes(term)) {
      const idx = section.body.toLowerCase().indexOf(term);
      const snippet = section.body.slice(Math.max(0, idx - 30), idx + 80).trim();
      if (!matches.some(m => m.includes(snippet.slice(0, 20)))) {
        matches.push(`${section.heading}: …${snippet}…`);
      }
    }
  }
}

function searchPlans(plans: ParsedPlan[], query: string): Hit[] {
  if (!query.trim()) return [];
  const terms = query.split('+').map(t => t.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) return [];

  return plans
    .map(plan => {
      const allMatches: string[] = [];
      let ok = true;
      for (const term of terms) {
        const termMatches: string[] = [];
        planMatchesTerm(plan, term, termMatches);
        if (termMatches.length === 0) { ok = false; break; }
        for (const m of termMatches) if (!allMatches.includes(m)) allMatches.push(m);
      }
      return { plan, matches: ok ? allMatches : [] };
    })
    .filter(h => h.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);
}

function highlight(text: string, query: string) {
  if (!query) return text;
  // highlight first term only for simplicity
  const first = (query.split('+')[0] ?? '').trim();
  const idx = text.toLowerCase().indexOf(first.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-od-yellow/30 text-od-yellow rounded px-0.5">{text.slice(idx, idx + first.length)}</mark>
      {text.slice(idx + first.length)}
    </>
  );
}

export function SearchPage() {
  const plans      = usePlanStore(s => s.plans);
  const repos      = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'plans' | 'assets'>('plans');
  const [selectedAsset, setSelectedAsset] = useState<AssetTarget | null>(null);
  const [tagsOpen, setTagsOpen] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setTagsOpen(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setTagsOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const hits = useMemo(() => searchPlans(plans, query), [plans, query]);
  const assets = useMemo(() => repos.flatMap(repo => (repo.assets ?? []).map(path => ({ repo, path })))
    .filter(item => !query.trim() || `${item.repo.label} ${item.path}`.toLowerCase().includes(query.toLowerCase())), [repos, query]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const plan of plans) for (const t of plan.frontmatter.tags ?? []) set.add(t);
    return [...set].sort();
  }, [plans]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <h1 className="text-base font-semibold text-foreground mb-3">Search</h1>
        <div className="flex gap-1 mb-3" role="tablist" aria-label="Search category">
          <button type="button" role="tab" aria-selected={mode === 'plans'} onClick={() => setMode('plans')} className={`rounded px-3 py-1.5 text-xs ${mode === 'plans' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Plans</button>
          <button type="button" role="tab" aria-selected={mode === 'assets'} onClick={() => setMode('assets')} className={`rounded px-3 py-1.5 text-xs ${mode === 'assets' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Images &amp; PDFs</button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 h-10"
            placeholder={mode === 'plans' ? 'Search titles, descriptions, sections, phases, tags… (use + for multiple, e.g. foo+bar)' : 'Search image and PDF paths…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {query && (
          <p className="text-xs text-muted-foreground mt-2">
            {mode === 'plans' ? hits.length : assets.length} result{(mode === 'plans' ? hits.length : assets.length) !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            {mode === 'plans' && <> {' · '}<TimeRemaining plans={hits.map(hit => hit.plan)} /></>}
          </p>
        )}
        {allTags.length > 0 && (
          <div className="mt-3">
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground mb-1.5" onClick={() => setTagsOpen(o => !o)}>
              {tagsOpen ? 'Hide tags' : 'Show tags'}
            </button>
            {tagsOpen && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(prev => {
                  const parts = prev.split('+').map(t => t.trim()).filter(Boolean);
                  if (parts.includes(tag)) {
                    return parts.filter(t => t !== tag).join('+');
                  }
                  return [...parts, tag].join('+');
                })}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${query.split('+').map(t=>t.trim()).includes(tag) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}
              >
                {tag}
              </button>
            ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {mode === 'plans' && !query && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">Start typing to search across all plans</p>
            <p className="text-xs mt-1">{plans.length} plan{plans.length !== 1 ? 's' : ''} indexed</p>
          </div>
        )}

        {mode === 'plans' && query && hits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {mode === 'assets' && assets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No images or PDFs found{query ? ` for “${query}”` : ''}</p>
          </div>
        )}
        {mode === 'assets' && assets.map(({ repo, path }) => (
          <button key={`${repo.id}:${path}`} type="button" onClick={() => setSelectedAsset({ repoId: repo.id, path })} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
            {path.toLowerCase().endsWith('.pdf') ? <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded border border-border bg-secondary/40"><FileText className="h-5 w-5 text-muted-foreground" /></span> : <AssetThumbnail target={{ repoId: repo.id, path }} />}
            <span className="min-w-0"><span className="block truncate text-sm text-foreground">{highlight(path, query)}</span><span className="block truncate text-xs text-muted-foreground">{repo.label}</span></span>
          </button>
        ))}
        {mode === 'plans' && hits.map(({ plan, matches }) => {
          const fm   = plan.frontmatter;
          const repo = repos.find(r => r.id === plan.repoId);
          return (
            <div
              key={plan.id}
              role="button"
              tabIndex={0}
              aria-label={`Open plan: ${plan.frontmatter.title ?? plan.fileName}`}
              onClick={() => selectPlan(plan.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlan(plan.id); }
              }}
              className="px-5 py-4 cursor-pointer hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-snug">
                    {highlight(fm.title, query)}
                  </p>
                  {fm.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {highlight(truncate(fm.description, 120), query)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {fm.status   && <StatusBadge status={fm.status} />}
                  {fm.priority && <PriorityBadge priority={fm.priority} />}
                </div>
              </div>

              {/* Repo pill */}
              {repo && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-2">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: repo.color }} />
                  {repo.label} / {plan.fileName}
                </div>
              )}

              <div className="mb-2"><TimeRemaining plans={[plan]} /></div>

              {/* Match snippets */}
              <div className="space-y-1">
                {matches.slice(0, 4).map((m, i) => (
                  <p key={i} className="text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1 font-mono leading-relaxed">
                    {highlight(m, query)}
                  </p>
                ))}
                {matches.length > 4 && (
                  <p className="text-xs text-muted-foreground">+{matches.length - 4} more matches</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedAsset && <AssetViewer target={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </div>
  );
}