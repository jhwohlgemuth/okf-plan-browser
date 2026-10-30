import { TimeRemaining } from '@/components/TimeRemaining';
import { Link } from 'react-router-dom';
import { Layers, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { FolderPicker } from '@/components/FolderPicker';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { WalkthroughButton } from '@/components/WalkthroughButton';

function HomeFooter() {
  const linkClass = 'font-medium text-foreground hover:text-od-blue transition-colors underline underline-offset-4 decoration-border hover:decoration-od-blue';

  return (
    <footer className="w-full border-t border-border pt-6 text-center text-xs leading-relaxed text-muted-foreground">
      Made with <span role="img" aria-label="love">❤️</span> by{' '}
      <a href="https://github.com/jhwohlgemuth" target="_blank" rel="noreferrer" className={linkClass}>
        jhwohlgemuth
      </a>{' '}
      with{' '}
      <a href="https://openai.com/codex/" target="_blank" rel="noreferrer" className={linkClass}>
        Codex
      </a>,{' '}
      <a href="https://github.com/features/copilot" target="_blank" rel="noreferrer" className={linkClass}>
        GitHub Copilot
      </a>, and{' '}
      <a href="https://www.microsoft.com/microsoft-365/copilot" target="_blank" rel="noreferrer" className={linkClass}>
        Microsoft 365 Copilot
      </a>
    </footer>
  );
}

function PlanningLink() {
  return (
    <Link data-tour="planning-link" to="/planning" className="block rounded-xl border border-border bg-card p-4 text-left hover:border-od-blue/60 transition-colors">
      <span className="block text-sm font-semibold text-foreground">Official home of the planning skill</span>
      <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
        Plan and implement in bounded phases, resume from saved progress, and draft articles with evidence review.
        Explore the workflows and download the skill.
      </span>
    </Link>
  );
}

export function HomePage() {
  const plans       = usePlanStore(s => s.plans);
  const repos       = usePlanStore(s => s.repos);
  const warnings    = usePlanStore(s => s.warnings);
  const isDemoData  = usePlanStore(s => s.isDemoData);
  const loadDemoData = usePlanStore(s => s.loadDemoData);
  const removeRepo  = usePlanStore(s => s.removeRepo);
  const clearAll    = usePlanStore(s => s.clearAll);
  const { toast } = useToast();

  const isEmpty = repos.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-full flex flex-col items-center px-6 py-10 gap-8">
        <div className="w-full max-w-[420px] flex flex-1 flex-col items-center justify-center text-center" data-tour="home-intro">
          <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center mb-4">
            <Layers className="h-6 w-6 text-od-blue" />
          </div>
          <h1 className="text-xl font-bold text-foreground">OKF Plan Browser</h1>
          <div className="mt-4"><WalkthroughButton prominent /></div>
          <div className="w-full mt-4"><PlanningLink /></div>
          <p className="text-xs text-muted-foreground mt-2 mb-6">
            Load a .wiki folder, or a GitHub / GitLab repo
          </p>

          <div className="w-full" data-tour="home-overview">
            <FolderPicker cards />
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="mt-5 text-od-purple bg-od-purple/10 hover:bg-od-purple/20 border border-od-purple/30"
            onClick={() => {
              loadDemoData();
              toast({ title: 'Demo data loaded', description: 'Synthetic plans are ready to explore' });
            }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            Load Demo Data
          </Button>

          <p className="text-[10px] text-muted-foreground mt-5">
            Supports the .wiki markdown format — YAML frontmatter, H1 sections, H2 phases. GitHub owner/repo or a public GitLab URL also works.
          </p>
        </div>
        <div className="w-full max-w-2xl">
          <HomeFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Hero */}
      <div data-tour="home-intro">
        <h1 className="text-2xl font-bold text-foreground mb-1">OKF Plan Browser</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Browse, filter, and visualise{' '}
          <span className="font-mono text-od-blue">.wiki/</span> markdown planning portfolios —
          dependency graphs, phase kanban, full-text search. Folders stay on this machine; remote
          wikis are fetched in the browser from GitHub or GitLab.
        </p>
        <div className="mt-4"><WalkthroughButton prominent /></div>
      </div>

      <PlanningLink />

      <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4" data-tour="home-overview">
            {[
              { label: 'Plans',    value: plans.length },
              { label: 'Repos',    value: repos.length },
              { label: 'Warnings', value: warnings.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-foreground font-mono">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div><TimeRemaining plans={plans} /></div>

          {/* Repo list */}
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {repos.map(repo => (
              <div key={repo.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ background: repo.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm text-foreground truncate">{repo.label}</span>
                  {repo.uuid && (
                    <span className="block font-mono text-[10px] text-muted-foreground truncate" title={repo.uuid}>
                      {repo.uuid}
                    </span>
                  )}
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  <span className="block">{repo.planCount} plan{repo.planCount !== 1 ? 's' : ''}</span>
                  <TimeRemaining plans={plans.filter(p => p.repoId === repo.id)} />
                </span>
                {!isDemoData && (
                  <button
                    onClick={() => removeRepo(repo.id)}
                    className="text-muted-foreground hover:text-od-red transition-colors p-1"
                    title="Remove repo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add another .wiki */}
          {!isDemoData && <FolderPicker label="+ Add another .wiki" compact />}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-od-yellow/10 border border-od-yellow/30 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-od-yellow text-xs font-semibold mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                {warnings.length} parse warning{warnings.length !== 1 ? 's' : ''}
              </div>
              {warnings.slice(0, 5).map((w, i) => (
                <div key={i} className="text-xs text-muted-foreground font-mono">
                  {w.repoId}/{w.fileName}: {w.errors[0]}
                </div>
              ))}
              {warnings.length > 5 && (
                <p className="text-xs text-muted-foreground">…and {warnings.length - 5} more</p>
              )}
            </div>
          )}

          {/* Clear all */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-od-red"
            onClick={() => {
              clearAll();
              toast({ title: 'Cleared all plans' });
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear all data
          </Button>
        </div>

      {/* Format reference */}
      <div className="border-t border-border pt-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Expected .wiki format
        </h2>
        <pre className="bg-card border border-border rounded-xl p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">{`---
type: Plan
title: "My Plan"
description: "What this is about"
difficulty: medium        # easy | medium | hard
impact: critical          # low | medium | high | critical
package: [pkg-a, pkg-b]
tags: [feature, api]
status: planned           # planned | in-progress | waiting-on-validation | blocked
priority: next            # next | high | medium | low
execution: phased         # phased | coordination
phase_budget_hours: 5
---

# Goal
Narrative...

## PA-01 Phase title
**Status:** planned
...`}</pre>
      </div>
      <HomeFooter />
    </div>
  );
}


