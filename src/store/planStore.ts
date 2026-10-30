import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { ParsedPlan, WikiRepo, PlanFilters, ParseWarning } from '@/types/wiki';
import { DEMO_PLANS, DEMO_REPOS } from '@/lib/demoData';
import { buildSearchText } from '@/lib/wikiParser';
import { restorePortfolio } from '@/lib/restorePortfolio';
import { forgetAllAssets, forgetAssets } from '@/lib/wikiAssets';
import { isEpic } from '@/lib/planKind';
import { clearHandles, deleteHandle } from '@/lib/handleStore';

export type CleanupOutcome =
  | { ok: true }
  | { ok: false; error: Error };

interface PlanStore {
  plans:          ParsedPlan[];
  repos:          WikiRepo[];
  warnings:       ParseWarning[];
  selectedPlanId: string | null;
  selectedAnchor: string | null;
  detailOpen:     boolean;
  filters:        PlanFilters;
  isDemoData:     boolean;
  storageError:   boolean;
  portfolioRevision: number;

  // Actions
  addPlans:      (plans: ParsedPlan[], repo: WikiRepo, warns: ParseWarning[]) => void;
  removeRepo:    (repoId: string) => Promise<CleanupOutcome>;
  selectPlan:    (id: string, anchor?: string) => void;
  syncPlanSelection: (id: string | null, anchor?: string | null) => void;
  closeDetail:   () => void;
  setFilter:     <K extends keyof PlanFilters>(key: K, value: PlanFilters[K]) => void;
  clearFilters:  () => void;
  loadDemoData:  () => void;
  clearAll:      () => Promise<CleanupOutcome>;
  clearSavedData: () => Promise<CleanupOutcome>;
}

export const PLAN_STORAGE_KEY = 'okf-plan-browser:wikis';

interface PersistedPortfolio {
  plans: ParsedPlan[];
  repos: WikiRepo[];
  warnings: ParseWarning[];
  portfolioRevision: number;
}

let persistedRevision = 0;

// Zustand's JSON storage serializes after every store update, including navigation and filters.
// Keep the revision check outside JSON.stringify so transient changes do no persistence work.
const portfolioStorage: PersistStorage<PersistedPortfolio> = {
  getItem: key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const value = JSON.parse(raw) as StorageValue<PersistedPortfolio>;
      persistedRevision = Number.isSafeInteger(value.state?.portfolioRevision)
        ? value.state.portfolioRevision
        : 0;
      return value;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    const revision = value.state.portfolioRevision;
    if (revision === persistedRevision) return;
    persistedRevision = revision;
    try {
      const stored: StorageValue<PersistedPortfolio> = {
        ...value,
        state: {
          ...value.state,
          plans: value.state.plans.map(plan => ({ ...plan, searchText: undefined })),
        },
      };
      localStorage.setItem(key, JSON.stringify(stored));
      if (usePlanStore.getState().storageError) usePlanStore.setState({ storageError: false });
    } catch {
      if (!usePlanStore.getState().storageError) usePlanStore.setState({ storageError: true });
    }
  },
  removeItem: key => { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

const EMPTY_FILTERS: PlanFilters = {
  kinds:      [],
  status:     [],
  priority:   [],
  impact:     [],
  difficulty: [],
  tags:       [],
  packages:   [],
  repos:      [],
  search:     '',
};

const cleanupOutcome = async (cleanup: Promise<unknown>): Promise<CleanupOutcome> => {
  try {
    await cleanup;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error('Folder access cleanup failed.') };
  }
};

export const usePlanStore = create<PlanStore>()(persist((set) => ({
  plans:          [],
  repos:          [],
  warnings:       [],
  selectedPlanId: null,
  selectedAnchor: null,
  detailOpen:     false,
  filters:        { ...EMPTY_FILTERS },
  isDemoData:     false,
  storageError:   false,
  portfolioRevision: 0,

  addPlans: (plans, repo, warns) =>
    set(s => ({
      plans:      [...s.plans.filter(p => p.repoId !== repo.id), ...plans],
      repos:      s.repos.find(r => r.id === repo.id)
                    ? s.repos.map(r => r.id === repo.id ? repo : r)
                    : [...s.repos, repo],
      warnings:   [...s.warnings.filter(w => w.repoId !== repo.id), ...warns],
      isDemoData: false,
      portfolioRevision: s.portfolioRevision + 1,
    })),

  removeRepo: (repoId) => {
    const cleanup = deleteHandle(repoId);
    forgetAssets(repoId);
    set(s => ({
      plans:    s.plans.filter(p => p.repoId !== repoId),
      repos:    s.repos.filter(r => r.id !== repoId),
      warnings: s.warnings.filter(w => w.repoId !== repoId),
      portfolioRevision: s.portfolioRevision + 1,
    }));
    return cleanupOutcome(cleanup);
  },

  selectPlan: (id, anchor) => set({ selectedPlanId: id, selectedAnchor: anchor ?? null, detailOpen: true }),
  syncPlanSelection: (id, anchor) => set({
    selectedPlanId: id,
    selectedAnchor: id ? anchor ?? null : null,
    detailOpen: !!id,
  }),
  closeDetail: () => set({ selectedPlanId: null, selectedAnchor: null, detailOpen: false }),

  setFilter: (key, value) =>
    set(s => ({ filters: { ...s.filters, [key]: value } })),

  clearFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

  loadDemoData: () => {
    usePlanStore.getState().repos.forEach(repo => forgetAssets(repo.id));
    void clearHandles().catch(() => undefined);
    set({
      plans:      DEMO_PLANS,
      repos:      DEMO_REPOS,
      warnings:   [],
      isDemoData: true,
      filters:    { ...EMPTY_FILTERS },
      portfolioRevision: usePlanStore.getState().portfolioRevision + 1,
    });
  },

  clearAll: () => {
    const cleanup = clearHandles();
    usePlanStore.getState().repos.forEach(repo => forgetAssets(repo.id));
    set(s => ({
      plans:          [],
      repos:          [],
      warnings:       [],
      selectedPlanId: null,
      selectedAnchor: null,
      detailOpen:     false,
      isDemoData:     false,
      filters:        { ...EMPTY_FILTERS },
      portfolioRevision: s.portfolioRevision + 1,
    }));
    return cleanupOutcome(cleanup);
  },

  clearSavedData: () => {
    const cleanup = clearHandles();
    forgetAllAssets();
    set(s => ({
      plans: [], repos: [], warnings: [], selectedPlanId: null, selectedAnchor: null, detailOpen: false,
      isDemoData: false, storageError: false, filters: { ...EMPTY_FILTERS },
      portfolioRevision: s.portfolioRevision + 1,
    }));
    usePlanStore.persist.clearStorage();
    return cleanupOutcome(cleanup);
  },
}), {
  name:    PLAN_STORAGE_KEY,
  version: 1,
  storage: portfolioStorage,
  merge: (saved, current) => ({
    ...current,
    ...restorePortfolio(saved),
    portfolioRevision: typeof (saved as Partial<PersistedPortfolio>)?.portfolioRevision === 'number'
      ? (saved as PersistedPortfolio).portfolioRevision
      : 0,
  }),
  // Demo data is never saved. The storage adapter strips derived search text only after this
  // revision changes, avoiding serialization as well as writes for transient UI updates.
  partialize: s => ({
    plans: s.isDemoData ? [] : s.plans,
    repos: s.isDemoData ? [] : s.repos,
    warnings: s.isDemoData ? [] : s.warnings,
    portfolioRevision: s.portfolioRevision,
  }),
}));

// ─── Derived selectors ────────────────────────────────────────────────────────

export function selectFilteredPlans(s: PlanStore): ParsedPlan[] {
  const f = s.filters;
  return s.plans.filter(p => {
    const fm = p.frontmatter;
    if (f.kinds.length && !f.kinds.includes(isEpic(p) ? 'epic' : 'plan')) return false;
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


