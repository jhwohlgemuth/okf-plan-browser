import { TimeRemaining } from '@/components/TimeRemaining';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileText, Search, Tags, X } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { Input } from '@/components/ui/input';
import { PlanStatusBadge } from '@/components/PlanStatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { truncate } from '@/lib/utils';
import type { ParsedPlan } from '@/types/wiki';
import { AssetThumbnail, AssetViewer, type AssetTarget } from '@/components/AssetViewer';
import { PlanKindBadge } from '@/components/PlanKindBadge';
import { formatPlanCounts, isEpic } from '@/lib/planKind';

interface Hit {
  plan:    ParsedPlan;
  matches: string[];
}

interface TextMatch { index: number; length: number }
interface TextMatcher {
  find: (text: string) => TextMatch | null;
  pattern: string;
  useRegex: boolean;
  matchCase: boolean;
}

function textMatcher(pattern: string, useRegex: boolean, matchCase: boolean): TextMatcher {
  if (useRegex) {
    const expression = new RegExp(pattern, matchCase ? '' : 'i');
    return { pattern, useRegex, matchCase, find: text => {
      const match = expression.exec(text);
      return match ? { index: match.index, length: match[0].length } : null;
    } };
  }
  const needle = matchCase ? pattern : pattern.toLowerCase();
  return { pattern, useRegex, matchCase, find: text => {
    const index = (matchCase ? text : text.toLowerCase()).indexOf(needle);
    return index < 0 ? null : { index, length: pattern.length };
  } };
}

function fileExtension(path: string): string | undefined {
  return /\.([^./]+)$/.exec(path.split(/[?#]/, 1)[0] ?? '')?.[1]?.toUpperCase();
}

function planMatchesTerm(plan: ParsedPlan, matcher: TextMatcher, matches: string[]) {
  const fm = plan.frontmatter;
  const epic = isEpic(plan);
  const kinds = epic ? ['epic'] : ['plan', 'phased'];
  if (kinds.some(kind => matcher.useRegex
    ? !!matcher.find(kind)
    : (matcher.matchCase ? matcher.pattern : matcher.pattern.toLowerCase()) === kind)) {
    matches.push(`Kind: ${epic ? 'Epic' : 'Phased plan'}`);
  }
  if (fm.title && matcher.find(fm.title))       matches.push(`Title: ${fm.title}`);
  if (fm.description && matcher.find(fm.description)) matches.push(`Description: ${truncate(fm.description, 100)}`);
  if (fm.tags?.some(t => matcher.find(t))) matches.push(`Tags: ${fm.tags.filter(t => matcher.find(t)).join(', ')}`);
  if (fm.package?.some(p => matcher.find(p))) matches.push(`Package: ${fm.package.filter(p => matcher.find(p)).join(', ')}`);

  for (const section of plan.sections) {
    if (matcher.find(section.heading)) {
      matches.push(`Section: ${section.heading}`);
    }
    for (const phase of section.phases) {
      if (matcher.find(phase.title)) {
        matches.push(`${/^phase\b/i.test(phase.id) ? '' : 'Phase '}${phase.id}: ${truncate(phase.title, 80)}`);
      }
      const bodyMatch = matcher.find(phase.rawBody);
      if (bodyMatch) {
        const idx = bodyMatch.index;
        const snippet = phase.rawBody.slice(Math.max(0, idx - 30), idx + 80).trim();
        if (!matches.some(m => m.includes(snippet.slice(0, 20)))) {
          matches.push(`…${snippet}…`);
        }
      }
    }
    const sectionMatch = matcher.find(section.body);
    if (sectionMatch) {
      const idx = sectionMatch.index;
      const snippet = section.body.slice(Math.max(0, idx - 30), idx + 80).trim();
      if (!matches.some(m => m.includes(snippet.slice(0, 20)))) {
        matches.push(`${section.heading}: …${snippet}…`);
      }
    }
  }
}

function searchPlans(plans: ParsedPlan[], matchers: TextMatcher[]): Hit[] {
  if (matchers.length === 0) return [];
  return plans
    .map(plan => {
      const allMatches: string[] = [];
      let ok = true;
      for (const matcher of matchers) {
        const termMatches: string[] = [];
        planMatchesTerm(plan, matcher, termMatches);
        if (termMatches.length === 0) { ok = false; break; }
        for (const m of termMatches) if (!allMatches.includes(m)) allMatches.push(m);
      }
      return { plan, matches: ok ? allMatches : [] };
    })
    .filter(h => h.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);
}

function highlight(text: string, matcher?: TextMatcher) {
  const match = matcher?.find(text);
  if (!match || match.length === 0) return text;
  return (
    <>
      {text.slice(0, match.index)}
      <mark className="bg-od-yellow/30 text-od-yellow rounded px-0.5">{text.slice(match.index, match.index + match.length)}</mark>
      {text.slice(match.index + match.length)}
    </>
  );
}

export function SearchPage() {
  const plans      = usePlanStore(s => s.plans);
  const repos      = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetTarget | null>(null);
  const [tagsOpen, setTagsOpen] = useState(true);
  const selectedTags = useMemo(() => [...new Set(searchParams.getAll('tag').map(tag => tag.trim()).filter(Boolean))]
    .sort(), [searchParams]);
  const selectedExtensions = useMemo(() => [...new Set(searchParams.getAll('ext')
    .map(extension => extension.trim().replace(/^\./, '').toUpperCase()).filter(Boolean))].sort(), [searchParams]);
  const routeMode = searchParams.get('mode');
  const mode: 'plans' | 'assets' = routeMode === 'assets'
    || (routeMode !== 'plans' && selectedExtensions.some(extension => extension !== 'MD'))
    ? 'assets' : 'plans';

  useEffect(() => {
    const canonical = new URLSearchParams(searchParams);
    canonical.delete('tag');
    canonical.delete('ext');
    canonical.delete('mode');
    selectedTags.forEach(tag => canonical.append('tag', tag));
    selectedExtensions.forEach(extension => canonical.append('ext', extension));
    if (mode === 'assets') canonical.append('mode', 'assets');
    if (canonical.toString() === searchParams.toString()) return;
    setSearchParams(canonical, { replace: true });
  }, [mode, searchParams, selectedExtensions, selectedTags, setSearchParams]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setTagsOpen(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setTagsOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const searchMatchers = useMemo(() => {
    const terms = useRegex
      ? (query.trim() ? [query] : [])
      : query.split('+').map(term => term.trim()).filter(Boolean);
    const seen = new Set(terms.map(term => matchCase ? term : term.toLowerCase()));
    const tagTerms = selectedTags.filter(tag => !seen.has(matchCase ? tag : tag.toLowerCase()));
    try {
      return {
        plan: [
          ...terms.map(term => textMatcher(term, useRegex, matchCase)),
          ...tagTerms.map(tag => textMatcher(tag, false, matchCase)),
        ],
        asset: query.trim() ? textMatcher(query, useRegex, matchCase) : null,
        error: null as string | null,
      };
    } catch (error) {
      return { plan: [] as TextMatcher[], asset: null, error: (error as Error).message };
    }
  }, [query, selectedTags, matchCase, useRegex]);
  const matchingPlans = useMemo(() => selectedExtensions.length === 0 ? plans : plans.filter(plan => {
    const paths = [plan.fileName, ...(plan.documents?.map(document => document.fileName) ?? [])];
    return paths.some(path => selectedExtensions.includes(fileExtension(path) ?? ''));
  }), [plans, selectedExtensions]);
  const hits = useMemo(() => searchMatchers.error ? [] : searchMatchers.plan.length > 0
    ? searchPlans(matchingPlans, searchMatchers.plan)
    : selectedExtensions.length > 0
      ? matchingPlans.map(plan => ({ plan, matches: [`File type: ${selectedExtensions.join(', ')}`] }))
      : [], [searchMatchers, matchingPlans, selectedExtensions]);
  const assets = useMemo(() => repos.flatMap(repo => (repo.assets ?? []).map(path => ({ repo, path })))
    .filter(item => selectedExtensions.length === 0 || selectedExtensions.includes(fileExtension(item.path) ?? ''))
    .filter(item => !searchMatchers.error && (!searchMatchers.asset || !!searchMatchers.asset.find(`${item.repo.label} ${item.path}`))),
  [repos, searchMatchers, selectedExtensions]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const plan of plans) for (const t of plan.frontmatter.tags ?? []) set.add(t);
    return [...set].sort();
  }, [plans]);
  const extensionTags = useMemo(() => {
    const paths = [
      ...plans.flatMap(plan => [plan.fileName, ...(plan.documents?.map(document => document.fileName) ?? [])]),
      ...repos.flatMap(repo => repo.assets ?? []),
    ];
    return [...new Set(paths.flatMap(path => fileExtension(path) ?? []))].sort();
  }, [plans, repos]);

  const changeMode = (nextMode: 'plans' | 'assets') => {
    const next = new URLSearchParams(searchParams);
    const compatibleExtensions = selectedExtensions.filter(extension => nextMode === 'plans'
      ? extension === 'MD' : extension !== 'MD');
    next.delete('ext');
    next.delete('mode');
    compatibleExtensions.forEach(extension => next.append('ext', extension));
    if (nextMode === 'assets') next.append('mode', 'assets');
    setSearchParams(next);
  };

  const toggleTag = (tag: string) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter(selected => selected !== tag)
      : [...selectedTags, tag].sort();
    const next = new URLSearchParams(searchParams);
    next.delete('tag');
    nextTags.forEach(selected => next.append('tag', selected));
    setSearchParams(next);
  };

  const toggleExtension = (extension: string) => {
    const nextExtensions = extension === 'MD'
      ? selectedExtensions.includes('MD') ? [] : ['MD']
      : selectedExtensions.includes(extension)
        ? selectedExtensions.filter(selected => selected !== extension && selected !== 'MD')
        : [...selectedExtensions.filter(selected => selected !== 'MD'), extension].sort();
    const next = new URLSearchParams(searchParams);
    next.delete('ext');
    next.delete('mode');
    nextExtensions.forEach(selected => next.append('ext', selected));
    if (extension !== 'MD') next.append('mode', 'assets');
    setSearchParams(next);
  };

  const clearTags = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tag');
    next.delete('ext');
    setSearchParams(next);
  };

  const activeSearch = mode === 'plans'
    ? [query.trim(), selectedTags.join('+'), selectedExtensions.join('+')].filter(Boolean).join(' · ')
    : [query, selectedExtensions.join('+')].filter(Boolean).join(' · ');
  const hasPlanSearch = searchMatchers.plan.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background" data-tour="search-controls">
        <h1 className="text-base font-semibold text-foreground mb-3">Search</h1>
        <div className="flex gap-1 mb-3" role="tablist" aria-label="Search category">
          <button type="button" role="tab" aria-selected={mode === 'plans'} onClick={() => changeMode('plans')} className={`rounded px-3 py-1.5 text-xs ${mode === 'plans' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Plans</button>
          <button type="button" role="tab" aria-selected={mode === 'assets'} onClick={() => changeMode('assets')} className={`rounded px-3 py-1.5 text-xs ${mode === 'assets' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Images &amp; PDFs</button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Search query"
            aria-invalid={!!searchMatchers.error}
            aria-describedby={searchMatchers.error ? 'search-query-error' : undefined}
            className="pl-10 pr-24 h-10"
            placeholder={useRegex ? 'Search with a regular expression…' : mode === 'plans' ? 'Search plans… (use + for multiple terms)' : 'Search image and PDF paths…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5" role="group" aria-label="Search options">
            <button
              type="button"
              aria-label="Match case"
              aria-pressed={matchCase}
              title="Match case"
              onClick={() => setMatchCase(value => !value)}
              className={`h-8 min-w-9 rounded px-1 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${matchCase ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >Aa</button>
            <button
              type="button"
              aria-label="Use regular expression"
              aria-pressed={useRegex}
              title="Use regular expression"
              onClick={() => setUseRegex(value => !value)}
              className={`h-8 min-w-9 rounded px-1 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${useRegex ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >.*</button>
          </div>
        </div>
        {searchMatchers.error && <p id="search-query-error" role="alert" className="mt-2 text-xs text-od-red">Invalid regular expression: {searchMatchers.error}</p>}
        {!searchMatchers.error && (query || (mode === 'plans' && selectedTags.length > 0) || selectedExtensions.length > 0) && (
          <p className="text-xs text-muted-foreground mt-2">
            {mode === 'plans' ? hits.length : assets.length} result{(mode === 'plans' ? hits.length : assets.length) !== 1 ? 's' : ''} for &ldquo;{activeSearch}&rdquo;
            {mode === 'plans' && <> {' · '}<TimeRemaining plans={hits.map(hit => hit.plan)} /></>}
          </p>
        )}
        {(allTags.length > 0 || extensionTags.length > 0) && (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                aria-expanded={tagsOpen}
                aria-controls="search-tag-groups"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setTagsOpen(o => !o)}
              >
                {tagsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                {tagsOpen ? 'Hide tags' : 'Show tags'}
              </button>
              <button
                type="button"
                disabled={selectedTags.length === 0 && selectedExtensions.length === 0}
                onClick={clearTags}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Clear tags
              </button>
            </div>
            {tagsOpen && (
              <div id="search-tag-groups" className="space-y-3 rounded-lg border border-border/70 bg-card/40 p-3">
                {allTags.length > 0 && (
                  <div role="group" aria-label="Plan tags">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                      <Tags className="h-3 w-3" aria-hidden />
                      Plan tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={selectedTags.includes(tag)}
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${selectedTags.includes(tag) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {extensionTags.length > 0 && (
                  <div className={allTags.length > 0 ? 'border-t border-border/60 pt-3' : ''}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">File types</p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="File types">
                      {extensionTags.map(extension => (
                        <button
                          key={extension}
                          type="button"
                          aria-pressed={selectedExtensions.includes(extension)}
                          onClick={() => toggleExtension(extension)}
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors ${selectedExtensions.includes(extension) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}
                        >
                          {extension}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {mode === 'plans' && !hasPlanSearch && selectedExtensions.length === 0 && !searchMatchers.error && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">Start typing to search across all plans</p>
            <p className="text-xs mt-1">{formatPlanCounts(plans)} indexed</p>
          </div>
        )}

        {mode === 'plans' && (hasPlanSearch || selectedExtensions.length > 0) && hits.length === 0 && !searchMatchers.error && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No results for &ldquo;{activeSearch}&rdquo;</p>
          </div>
        )}

        {mode === 'assets' && assets.length === 0 && !searchMatchers.error && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No images or PDFs found{activeSearch ? ` for “${activeSearch}”` : ''}</p>
          </div>
        )}
        {mode === 'assets' && assets.map(({ repo, path }) => (
          <button key={`${repo.id}:${path}`} type="button" onClick={() => setSelectedAsset({ repoId: repo.id, path })} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
            {path.toLowerCase().endsWith('.pdf') ? <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded border border-border bg-secondary/40"><FileText className="h-5 w-5 text-muted-foreground" /></span> : <AssetThumbnail target={{ repoId: repo.id, path }} />}
            <span className="min-w-0"><span className="block truncate text-sm text-foreground">{highlight(path, searchMatchers.asset ?? undefined)}</span><span className="block truncate text-xs text-muted-foreground">{repo.label}</span></span>
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
              aria-label={`Open ${isEpic(plan) ? 'Epic' : 'plan'}: ${plan.frontmatter.title ?? plan.fileName}`}
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
                    {highlight(fm.title, searchMatchers.plan[0])}
                  </p>
                  {fm.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {highlight(truncate(fm.description, 120), searchMatchers.plan[0])}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PlanKindBadge plan={plan} compact />
                  <PlanStatusBadge plan={plan} />
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
                    {highlight(m, searchMatchers.plan[0])}
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
