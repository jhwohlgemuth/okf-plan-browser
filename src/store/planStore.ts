import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { ParsedPlan, WikiRepo, PlanFilters, ParseWarning } from '@/types/wiki';
import { DEMO_PLANS, DEMO_REPOS } from '@/lib/demoData';
import { buildSearchText } from '@/lib/wikiParser';
import { restorePortfolio } from '@/lib/restorePortfolio';

interface PlanStore {
  plans:          ParsedPlan[];
  repos:          WikiRepo[];
  warnings:       ParseWarning[];
  selectedPlanId: string | null;
  detailOpen:     boolean;
  filters:        PlanFilters;
  isDemoData:     boolean;
  storageError:   boolean;

  // Actions
  addPlans:      (plans: ParsedPlan[], repo: WikiRepo, warns: ParseWarning[]) => void;
  removeRepo:    (repoId: string) => void;
  selectPlan:    (id: string) => void;
  closeDetail:   () => void;
  setFilter:     <K extends keyof PlanFilters>(key: K, value: PlanFilters[K]) => void;
  clearFilters:  () => void;
  loadDemoData:  () => void;
  clearAll:      () => void;
  clearSavedData: () => void;
}

export const PLAN_STORAGE_KEY = 'okf-plan-browser:wikis';

// Quota errors must not break the app; surface them through storageError instead.
const safeStorage: StateStorage = {
  getItem: k => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
      if (usePlanStore.getState().storageError) usePlanStore.setState({ storageError: false });
    } catch {
      if (!usePlanStore.getState().storageError) usePlanStore.setState({ storageError: true });
    }
  },
  removeItem: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const EMPTY_FILTERS: PlanFilters = {
  status:     [],
  priority:   [],
  impact:     [],
  difficulty: [],
  tags:       [],
  packages:   [],
  repos:      [],
  search:     '',
};

export const usePlanStore = create<PlanStore>()(persist((set) => ({
  plans:          [],
  repos:          [],
  warnings:       [],
  selectedPlanId: null,
  detailOpen:     false,
  filters:        { ...EMPTY_FILTERS },
  isDemoData:     false,
  storageError:   false,

  addPlans: (plans, repo, warns) =>
    set(s => ({
      plans:      [...s.plans.filter(p => p.repoId !== repo.id), ...plans],
      repos:      s.repos.find(r => r.id === repo.id)
                    ? s.repos.map(r => r.id === repo.id ? repo : r)
                    : [...s.repos, repo],
      warnings:   [...s.warnings.filter(w => w.repoId !== repo.id), ...warns],
      isDemoData: false,
    })),

  removeRepo: (repoId) =>
    set(s => ({
      plans:    s.plans.filter(p => p.repoId !== repoId),
      repos:    s.repos.filter(r => r.id !== repoId),
      warnings: s.warnings.filter(w => w.repoId !== repoId),
    })),

  selectPlan: (id) => set({ selectedPlanId: id, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false }),

  setFilter: (key, value) =>
    set(s => ({ filters: { ...s.filters, [key]: value } })),

  clearFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

  loadDemoData: () =>
    set({
      plans:      DEMO_PLANS,
      repos:      DEMO_REPOS,
      warnings:   [],
      isDemoData: true,
      filters:    { ...EMPTY_FILTERS },
    }),

  clearAll: () =>
    set({
      plans:          [],
      repos:          [],
      warnings:       [],
      selectedPlanId: null,
      detailOpen:     false,
      isDemoData:     false,
      filters:        { ...EMPTY_FILTERS },
    }),

  clearSavedData: () => {
    set({
      plans: [], repos: [], warnings: [], selectedPlanId: null, detailOpen: false,
      isDemoData: false, storageError: false, filters: { ...EMPTY_FILTERS },
    });
    usePlanStore.persist.clearStorage();
  },
}), {
  name:    PLAN_STORAGE_KEY,
  version: 1,
  storage: createJSONStorage(() => safeStorage),
  merge: (saved, current) => ({ ...current, ...restorePortfolio(saved) }),
  // Demo data is never saved; the derived search text is rebuilt on load rather than stored.
  partialize: s => s.isDemoData
    ? { plans: [], repos: [], warnings: [] }
    : {
        plans:    s.plans.map(p => ({ ...p, searchText: undefined })),
        repos:    s.repos,
        warnings: s.warnings,
      },
}));

// ─── Derived selectors ────────────────────────────────────────────────────────

export function selectFilteredPlans(s: PlanStore): ParsedPlan[] {
  const f = s.filters;
  return s.plans.filter(p => {
    const fm = p.frontmatter;
    if (f.status.length     && !f.status.includes(fm.status!))         return false;
    if (f.priority.length   && !f.priority.includes(fm.priority!))     return false;
    if (f.impact.length     && !f.impact.includes(fm.impact!))         return false;
    if (f.difficulty.length && !f.difficulty.includes(fm.difficulty!)) return false;
    if (f.repos.length      && !f.repos.includes(p.repoId))            return false;
    if (f.tags.length       && !f.tags.some(t => fm.tags?.includes(t))) return false;
    if (f.packages.length   && !f.packages.some(pk => fm.package?.includes(pk))) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!(p.searchText ?? buildSearchText(p)).includes(q)) return false;
    }
    return true;
  });
}


