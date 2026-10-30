import { TimeRemaining } from '@/components/TimeRemaining';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Package, Tag, Clock, GitBranch, Quote } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn } from '@/lib/utils';
import { Markdown } from './Markdown';
import { headingAnchorForPlan, planAnchor, resolvePlanTarget } from '@/lib/planLinks';
import { resolveWikiPath } from '@/lib/wikiAssets';
import { AssetViewer, type AssetTarget } from './AssetViewer';
import { useWalkthrough } from './Walkthrough';

const IMPACT_CLASSES: Record<string, string> = {
  critical: 'text-od-red',
  high:     'text-od-orange',
  medium:   'text-od-yellow',
  low:      'text-od-muted',
};

export function PlanDetailPanel() {
  const { active: tourActive } = useWalkthrough();
  const plans          = usePlanStore(s => s.plans);
  const selectedPlanId = usePlanStore(s => s.selectedPlanId);
  const selectedAnchor = usePlanStore(s => s.selectedAnchor);
  const detailOpen     = usePlanStore(s => s.detailOpen);
  const closeDetail    = usePlanStore(s => s.closeDetail);
  const repos          = usePlanStore(s => s.repos);
  const selectPlan     = usePlanStore(s => s.selectPlan);
  const plan = plans.find(p => p.id === selectedPlanId);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetTarget | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const relatedRef = useRef<HTMLElement>(null);
  const location = useLocation();

  const repo = repos.find(r => r.id === plan?.repoId);
  const fm   = plan?.frontmatter;

  useEffect(() => { setSelectedDocument(null); setSelectedAsset(null); }, [selectedPlanId]);

  /** Resolve links against the Markdown file containing them. */
  const resolveLink = (href: string, source = plan?.fileName) => {
    if (!plan) return null;
    const path = source ? resolveWikiPath(source, href) : null;
    const target = resolvePlanTarget(plans, { ...plan, fileName: source ?? plan.fileName }, href);
    if (target) return { exists: true, open: () => selectPlan(target.plan.id, target.anchor) };
    const document = plan.documents?.find(d => d.fileName === path);
    if (document) return { exists: true, open: () => {
      setSelectedDocument(document.fileName);
      requestAnimationFrame(() => relatedRef.current?.scrollIntoView({ block: 'start' }));
    } };
    if (path && repo?.assets?.includes(path)) return { exists: true, open: () => setSelectedAsset({ repoId: plan.repoId, path }) };
    return { exists: false, open: () => undefined };
  };
  const resolveImage = (src: string, source = plan?.fileName): AssetTarget | null => {
    const path = source ? resolveWikiPath(source, src) : null;
    return path && plan && repo?.assets?.includes(path) && !path.toLowerCase().endsWith('.pdf')
      ? { repoId: plan.repoId, path } : null;
  };
  const selectedDoc = plan?.documents?.find(d => d.fileName === selectedDocument);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !tourActive) closeDetail(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDetail, tourActive]);

  const open = detailOpen && !!selectedPlanId;
  const [mounted, setMounted] = useState(open);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      if (!mounted) trigger.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const t = setTimeout(() => {
      setMounted(false);
      trigger.current?.focus();
      trigger.current = null;
    }, 200);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (open && mounted && !selectedAnchor && !tourActive) panelRef.current?.focus();
  }, [open, mounted, selectedAnchor, tourActive]);

  useEffect(() => {
    if (!open || !mounted || !selectedAnchor) return;
    let frame = 0;
    let attempts = 0;
    const focusTarget = () => {
      const target = panelRef.current?.querySelector<HTMLElement>(`#${CSS.escape(selectedAnchor)}`);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        target.focus({ preventScroll: true });
        return;
      }
      if (++attempts < 4) frame = requestAnimationFrame(focusTarget);
      else panelRef.current?.focus();
    };
    frame = requestAnimationFrame(focusTarget);
    return () => cancelAnimationFrame(frame);
  }, [location.hash, mounted, open, plan?.id, selectedAnchor, selectedPlanId]);

  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (tourActive) return;
    if (e.key !== 'Tab') return;
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted || !selectedPlanId) return null;
  const closing = !open;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn('fixed inset-0 z-40 bg-black/40', closing ? 'okf-fade-out' : 'okf-fade-in')}
        onClick={closeDetail}
      />

      {/* Panel */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog focus trap */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={tourActive ? undefined : 'true'}
        data-tour="plan-detail"
        aria-labelledby="plan-detail-title"
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          'fixed right-0 top-0 z-50 h-dvh w-full sm:w-[70vw] lg:w-[60vw] max-w-[1100px] bg-card border-l border-border shadow-2xl overflow-y-auto outline-none',
          closing ? 'okf-panel-out' : 'okf-panel-in',
        )}
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
                <h2 id="plan-detail-title" className="text-base font-semibold text-foreground leading-tight">
                  {fm?.title ?? 'Plan not loaded'}
                </h2>
              </div>
              <button
                onClick={closeDetail}
                                aria-label="Close plan details"
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 sm:px-8 py-6 space-y-7">
              {plan ? (
                <>
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

              <div><TimeRemaining plans={[plan]} /></div>

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
                    <GitBranch className="h-3.5 w-3.5" /> Plan links
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
                    <h3
                      id={planAnchor(section.heading)}
                      tabIndex={-1}
                      className="text-sm font-semibold text-foreground border-b border-border pb-1.5 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
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
                            <TimeRemaining plans={[plan]} phase={ph} label={false} />
                          </span>
                        ))}
                      </div>
                    )}

                    {section.body.trim() && <Markdown headingId={heading => headingAnchorForPlan(plan, heading)} resolveLink={href => resolveLink(href)} resolveImage={src => resolveImage(src)} openAsset={setSelectedAsset}>{section.body.trim()}</Markdown>}
                  </div>
                </section>
              ))}

              {(plan.documents?.length ?? 0) > 0 && (
                <section ref={relatedRef} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1.5">Related Markdown</h3>
                  <div className="flex flex-wrap gap-2">
                    {plan.documents?.map(doc => <button key={doc.fileName} type="button" onClick={() => setSelectedDocument(doc.fileName)} className={cn('rounded px-2.5 py-1 text-xs font-mono', selectedDocument === doc.fileName ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent')}>{doc.fileName.split('/').pop()}</button>)}
                  </div>
                  {selectedDoc && <div className="rounded-lg border border-border p-4">
                    <p className="mb-3 text-xs font-mono text-muted-foreground">{selectedDoc.fileName}</p>
                    <Markdown headingId={heading => headingAnchorForPlan(plan, heading)} resolveLink={href => resolveLink(href, selectedDoc.fileName)} resolveImage={src => resolveImage(src, selectedDoc.fileName)} openAsset={setSelectedAsset}>{selectedDoc.text.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')}</Markdown>
                  </div>}
                </section>
              )}

              {/* File path */}
              <p className="text-xs text-muted-foreground font-mono border-t border-border pt-3">
                {plan.repoId}/{plan.fileName}
              </p>
                </>
              ) : (
                <div role="status" className="rounded-xl border border-border bg-background/50 p-5">
                  <p className="text-sm text-foreground">
                    This shared link points to a plan that is not loaded on this device.
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{selectedPlanId}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Load the matching local folder or remote repository to open it. The link will remain in the address bar.
                  </p>
                </div>
              )}
            </div>
          </div>
          {selectedAsset && <AssetViewer target={selectedAsset} onClose={() => setSelectedAsset(null)} />}
        </>
  );
}


