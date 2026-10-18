import { useEffect, useRef } from 'react';
import { X, Package, Tag, Clock, GitBranch, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanStore } from '@/store/planStore';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn } from '@/lib/utils';
import { Markdown } from './Markdown';

const IMPACT_CLASSES: Record<string, string> = {
  critical: 'text-od-red',
  high:     'text-od-orange',
  medium:   'text-od-yellow',
  low:      'text-od-muted',
};

export function PlanDetailPanel() {
  const { plans, selectedPlanId, detailOpen, closeDetail, repos, selectPlan } = usePlanStore();
  const plan = plans.find(p => p.id === selectedPlanId);
  const panelRef = useRef<HTMLDivElement>(null);

  const repo = repos.find(r => r.id === plan?.repoId);
  const fm   = plan?.frontmatter;

  /** Resolve a relative .md link against the current plan's path, within the same wiki. */
  const resolveLink = (href: string) => {
    if (!plan) return null;
    const pathPart = href.split('#')[0].split('?')[0];
    if (!pathPart) return null;
    let resolved: string;
    try {
      const url = new URL(decodeURI(pathPart), `http://w/${plan.fileName}`);
      resolved = decodeURIComponent(url.pathname).replace(/^\//, '');
    } catch {
      return null;
    }
    const target = plans.find(p => p.repoId === plan.repoId && p.fileName.toLowerCase() === resolved.toLowerCase());
    return { exists: !!target, open: () => target && selectPlan(target.id) };
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDetail]);

  return (
    <AnimatePresence>
      {detailOpen && plan && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDetail}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="fixed right-0 top-0 z-50 h-dvh w-full sm:w-[70vw] lg:w-[60vw] max-w-[1100px] bg-card border-l border-border shadow-2xl overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 sm:px-8 py-5 flex items-start justify-between gap-3 z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {repo && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: repo.color }} />
                      {repo.label}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold text-foreground leading-tight">{fm?.title}</h2>
              </div>
              <button
                onClick={closeDetail}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 sm:px-8 py-6 space-y-7">
              {/* Description */}
              {fm?.description && (
                <blockquote className="relative rounded-lg border border-primary/20 border-l-4 border-l-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 text-[15px] sm:text-base font-medium leading-relaxed text-foreground">
                  <Quote className="absolute right-3 top-3 h-5 w-5 text-primary/20" aria-hidden />
                  <span className="block mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary/80">Summary</span>
                  {fm.description}
                </blockquote>
              )}

              <div className="rounded-lg border border-border bg-background/40 p-4 space-y-4">
              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {fm?.status   && <StatusBadge status={fm.status} />}
                {fm?.priority && <PriorityBadge priority={fm.priority} />}
                {fm?.impact   && (
                  <span className={cn('text-xs font-medium capitalize', IMPACT_CLASSES[fm.impact] ?? '')}>
                    {fm.impact} impact
                  </span>
                )}
                {fm?.difficulty && (
                  <span className="text-xs text-muted-foreground capitalize">{fm.difficulty}</span>
                )}
                {fm?.execution && (
                  <span className="text-xs text-muted-foreground capitalize">{fm.execution}</span>
                )}
              </div>

              {/* phase_budget_hours */}
              {fm?.phase_budget_hours != null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {fm.phase_budget_hours}h budget
                </div>
              )}

              {/* Packages */}
              {(fm?.package?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <Package className="h-3.5 w-3.5" /> Packages
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fm!.package!.map(p => (
                      <span key={p} className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {(fm?.tags?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <Tag className="h-3.5 w-3.5" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fm!.tags!.map(t => (
                      <span key={t} className="text-xs bg-accent px-2 py-0.5 rounded text-accent-foreground">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {plan.dependencies.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <GitBranch className="h-3.5 w-3.5" /> Dependencies
                  </div>
                  <ul className="space-y-1.5 pl-5 border-l border-border/60">
                    {[...new Map(plan.dependencies.map(d => [d.href, d])).values()].map(d => {
                      const t = resolveLink(d.href);
                      return (
                        <li key={d.href} className="text-xs font-mono truncate" title={d.href}>
                          {t?.exists ? (
                            <button className="text-od-blue hover:underline" onClick={t.open}>{d.text || d.href}</button>
                          ) : (
                            <span className="text-muted-foreground">{d.text || d.href}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              </div>

              {/* Sections */}
              {plan.sections.filter(s => s.heading || s.body.trim() || s.phases.length).map((section, si) => (
                <section key={si} className="space-y-3">
                  {section.heading && (
                    <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5 flex items-center gap-2">
                      <span className="h-3.5 w-1 rounded-full bg-primary" />
                      {section.heading}
                    </h3>
                  )}

                  <div className="pl-3 ml-0.5 border-l border-border/60 space-y-3">
                    {section.phases.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {section.phases.map(ph => (
                          <span key={ph.id} className="inline-flex items-center gap-1.5 bg-secondary rounded px-2.5 py-1" title={ph.title}>
                            <span className="font-mono text-xs text-od-blue font-medium">{ph.id}</span>
                            <StatusBadge status={ph.status} />
                          </span>
                        ))}
                      </div>
                    )}

                    {section.body.trim() && <Markdown resolveLink={resolveLink}>{section.body.trim()}</Markdown>}
                  </div>
                </section>
              ))}

              {/* File path */}
              <p className="text-xs text-muted-foreground font-mono border-t border-border pt-3">
                {plan.repoId}/{plan.fileName}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


