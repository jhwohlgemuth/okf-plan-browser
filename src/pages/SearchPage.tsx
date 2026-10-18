import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { truncate } from '@/lib/utils';
import type { ParsedPlan } from '@/types/wiki';

interface Hit {
  plan:    ParsedPlan;
  matches: string[];
}

function searchPlans(plans: ParsedPlan[], query: string): Hit[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();

  return plans
    .map(plan => {
      const matches: string[] = [];
      const fm = plan.frontmatter;

      if (fm.title?.toLowerCase().includes(q))       matches.push(`Title: ${fm.title}`);
      if (fm.description?.toLowerCase().includes(q)) matches.push(`Description: ${truncate(fm.description, 100)}`);
      if (fm.tags?.some(t => t.toLowerCase().includes(q))) matches.push(`Tags: ${fm.tags!.filter(t => t.toLowerCase().includes(q)).join(', ')}`);
      if (fm.package?.some(p => p.toLowerCase().includes(q))) matches.push(`Package: ${fm.package!.filter(p => p.toLowerCase().includes(q)).join(', ')}`);

      for (const section of plan.sections) {
        if (section.heading.toLowerCase().includes(q)) {
          matches.push(`Section: ${section.heading}`);
        }
        for (const phase of section.phases) {
          if (phase.title.toLowerCase().includes(q)) {
            matches.push(`${/^phase\b/i.test(phase.id) ? '' : 'Phase '}${phase.id}: ${truncate(phase.title, 80)}`);
          }
          if (phase.rawBody.toLowerCase().includes(q)) {
            const idx = phase.rawBody.toLowerCase().indexOf(q);
            const snippet = phase.rawBody.slice(Math.max(0, idx - 30), idx + 80).trim();
            if (!matches.some(m => m.includes(snippet.slice(0, 20)))) {
              matches.push(`…${snippet}…`);
            }
          }
        }
        if (section.body.toLowerCase().includes(q)) {
          const idx = section.body.toLowerCase().indexOf(q);
          const snippet = section.body.slice(Math.max(0, idx - 30), idx + 80).trim();
          if (!matches.some(m => m.includes(snippet.slice(0, 20)))) {
            matches.push(`${section.heading}: …${snippet}…`);
          }
        }
      }

      return { plan, matches };
    })
    .filter(h => h.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-od-yellow/30 text-od-yellow rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchPage() {
  const plans      = usePlanStore(s => s.plans);
  const repos      = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);
  const [query, setQuery] = useState('');

  const hits = useMemo(() => searchPlans(plans, query), [plans, query]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <h1 className="text-base font-semibold text-foreground mb-3">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 h-10"
            placeholder="Search titles, descriptions, sections, phases, tags…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {query && (
          <p className="text-xs text-muted-foreground mt-2">
            {hits.length} result{hits.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {!query && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">Start typing to search across all plans</p>
            <p className="text-xs mt-1">{plans.length} plan{plans.length !== 1 ? 's' : ''} indexed</p>
          </div>
        )}

        {query && hits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {hits.map(({ plan, matches }) => {
          const fm   = plan.frontmatter;
          const repo = repos.find(r => r.id === plan.repoId);
          return (
            <div
              key={plan.id}
              onClick={() => selectPlan(plan.id)}
              className="px-5 py-4 cursor-pointer hover:bg-accent/40 transition-colors"
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
    </div>
  );
}
