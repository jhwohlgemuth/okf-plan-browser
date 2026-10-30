import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { buildPlanEdges } from '@/lib/planLinks';
import { canStoreForgeTokens } from '@/lib/githubToken';
import { useUiStore } from '@/store/uiStore';
import './walkthrough.css';

type TourStep = DriveStep & { route: string; detail?: boolean };
type WalkthroughContextValue = { start: () => void; active: boolean };

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useWalkthrough() {
  const context = useContext(WalkthroughContext);
  if (!context) throw new Error('WalkthroughProvider is missing');
  return context;
}

const step = (route: string, element: string, title: string, description: string, detail = false): TourStep => ({
  route, element, detail, popover: { title, description },
});

interface TourOptions {
  hasPlan: boolean;
  hasPhases: boolean;
  hasRelationships: boolean;
  hasRepos: boolean;
  isDemoData: boolean;
  tokenStorageAvailable: boolean;
  refreshTarget: string;
  refreshHint: string;
}

function buildSteps({ hasPlan, hasPhases, hasRelationships, hasRepos, isDemoData,
  tokenStorageAvailable, refreshTarget, refreshHint }: TourOptions): TourStep[] {
  return [
    step('/home', '[data-tour="home-intro"]', 'Welcome to Plan Browser', 'Browse a .wiki planning portfolio from a local folder, GitHub, or GitLab. This tour uses your loaded plans, or the built-in demo plans.'),
    step('/home', '[data-tour="home-overview"]', 'Portfolio at a glance', 'See plan and repository counts, warnings, and estimated time remaining.'),
    step('/home', refreshTarget, 'Refresh project wikis', `${refreshHint}${isDemoData
      ? 'Demo plans have no source to refresh. With a project wiki loaded, use Refresh all or the icon beside one project to re-read it.'
      : 'Use Refresh all or the icon beside one project to re-read its wiki. A local folder may need to be reselected if access has expired.'}`),
    step('/home', '[data-tour="planning-link"]', 'Planning workflows', 'The Planning Skill page explains how to create and work through the plans shown here.'),
    step('/portfolio', '[data-tour="portfolio-search"]', 'Find a plan quickly', 'Quick search narrows the portfolio by plan text.'),
    step('/portfolio', '[data-tour="portfolio-filters"]', 'Narrow the portfolio', 'Filter by status, priority, impact, difficulty, repository, tags, or package. Your current filters will stay unchanged during this tour.'),
    ...(hasPlan ? [step('/portfolio', '[data-tour="plan-table"]', 'Compare plans', 'Sort the table by priority, status, impact, difficulty, or remaining time. Select a row to read the full plan.'),
      step('/portfolio', '[data-tour="plan-detail"]', 'Read plan details', 'The detail panel shows the summary, metadata, dependencies, sections, phases, and related files. Links can open other plans.', true)] : []),
    step('/phases', '[data-tour="phase-board"]', 'Track phases', hasPhases ? 'The board groups phases by status. Select a card to jump into its plan.' : 'When plans contain phases, the board groups them by status and links back to their plans.'),
    step('/graph', '[data-tour="dependency-graph"]', 'Explore relationships', 'Nodes represent plans. Use the controls to zoom, drag nodes, and select one to open its details.'),
    ...(hasRelationships ? [step('/graph', '[data-tour="graph-relationships"]', 'Resolved links', 'This list explains the dependency and reference lines in the graph. Select a relationship to open its target plan.')] : []),
    step('/search', '[data-tour="search-controls"]', 'Search plans and assets', 'Search plan text, tags, images, and PDFs. Switch categories to choose what you are looking for.'),
    step('/settings', '[data-tour="settings-theme"]', 'Choose an appearance', 'Use Dark, Light, or System mode. The tour will leave your current choice alone.'),
    step('/settings', '[data-tour="settings-github-token"]', 'GitHub access token', tokenStorageAvailable
      ? 'For private GitHub repositories, add an expiring fine-grained token limited to the repositories you need, with Contents: read. Web tokens last only for this tab; the desktop app uses the operating system credential store.'
      : 'GitHub tokens are disabled on this page until you use HTTPS or the desktop app.'),
    step('/settings', '[data-tour="settings-gitlab-token"]', 'GitLab access token', tokenStorageAvailable
      ? 'For private or internal GitLab projects, enter the exact GitLab host and an expiring token with read_repository access. Tokens are kept separate for each host.'
      : 'GitLab tokens are disabled on this page until you use HTTPS or the desktop app.'),
    step('/settings', '[data-tour="settings-data"]', 'Manage loaded data', 'Review loaded plans and repositories here. This page also contains removal controls, so use them only when you intend to clear data.'),
    ...(hasRepos ? [step('/settings', '[data-tour="remove-wiki"]', 'Remove one project wiki', 'This removes one project from the browser portfolio. It does not delete its source folder or remote repository.')] : []),
    step('/settings', '[data-tour="clear-loaded"]', 'Clear loaded wikis', 'This clears all loaded projects from this browser, including the saved portfolio. Source folders and repositories remain in place; configured tokens are kept.'),
    step('/settings', '[data-tour="clear-saved"]', 'Clear saved data and tokens', 'This removes the saved portfolio and forgets all configured GitHub and GitLab tokens. It does not delete source folders or remote repositories.'),
    step('/about', '[data-tour="about-heading"]', 'More information', 'About links to the planning skill, project source, and format background. You can start this tour again here or on Home.'),
  ];
}

function visibleTarget(selector: string): Element | null {
  const element = document.querySelector(selector);
  return element && element.getClientRects().length > 0 ? element : null;
}

async function waitForTarget(selector: string, isCurrent: () => boolean): Promise<boolean> {
  const deadline = Date.now() + 4000;
  while (isCurrent() && Date.now() < deadline) {
    if (visibleTarget(selector)) return true;
    await new Promise(resolve => window.setTimeout(resolve, 40));
  }
  return false;
}

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const tourRef = useRef<Driver | null>(null);
  const finishRef = useRef<(() => void) | null>(null);
  const runRef = useRef(0);

  useEffect(() => () => { runRef.current++; tourRef.current?.destroy(); tourRef.current = null; }, []);
  useEffect(() => {
    if (!active) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      tourRef.current?.destroy();
      finishRef.current?.();
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [active]);

  const start = () => {
    if (tourRef.current) return;
    const state = usePlanStore.getState();
    const filtered = selectFilteredPlans(state);
    const chosenPlan = filtered[0];
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const collapsed = useUiStore.getState().sidebarCollapsed;
    const refreshTarget = isDesktop
      ? collapsed ? '[data-tour="sidebar-toggle"]' : '[data-tour="sidebar-repos"]'
      : '[data-tour="navigation-trigger"]';
    const steps = buildSteps({
      hasPlan: !!chosenPlan,
      hasPhases: state.plans.some(plan => plan.sections.some(section => section.phases.length > 0)),
      hasRelationships: buildPlanEdges(state.plans).length > 0,
      hasRepos: state.repos.length > 0,
      isDemoData: state.isDemoData,
      tokenStorageAvailable: canStoreForgeTokens(),
      refreshTarget,
      refreshHint: isDesktop
        ? collapsed ? 'Expand the sidebar to find the project refresh controls. ' : ''
        : 'Open the navigation menu to find the project refresh controls. ',
    });
    const origin = `${location.pathname}${location.search}${location.hash}`;
    const run = ++runRef.current;
    let moving = false;
    const isCurrent = () => runRef.current === run;
    const finish = () => {
      if (!isCurrent()) return;
      runRef.current++;
      tourRef.current = null;
      finishRef.current = null;
      setActive(false);
      usePlanStore.getState().closeDetail();
      navigate(origin, { replace: true });
    };
    finishRef.current = finish;
    const tour = driver({
      steps,
      showButtons: ['next', 'previous', 'close'],
      showProgress: true,
      smoothScroll: true,
      overlayClickBehavior: 'none',
      popoverClass: 'okf-walkthrough',
      onPopoverRender: popover => {
        // Driver.js focuses the first popover button (Close) after this hook.
        // Move focus to Next once its render finishes so arrow navigation does
        // not leave a focus ring on Close. Close remains reachable with Tab.
        queueMicrotask(() => {
          if (popover.wrapper.isConnected) popover.nextButton.focus();
        });
      },
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      onNextClick: () => { void move((tour.getActiveIndex() ?? -1) + 1, 1); },
      onPrevClick: () => { void move((tour.getActiveIndex() ?? 0) - 1, -1); },
      onDoneClick: () => { useUiStore.getState().completeTour(); tour.destroy(); finish(); },
      onCloseClick: () => { tour.destroy(); finish(); },
      onDestroyed: finish,
    });
    tourRef.current = tour;
    setActive(true);

    async function move(index: number, direction: 1 | -1) {
      if (moving || !isCurrent()) return;
      moving = true;
      try {
        while (index >= 0 && index < steps.length && isCurrent()) {
          const next = steps[index];
          if (!next) break;
          usePlanStore.getState().closeDetail();
          const route = next.detail && chosenPlan
            ? `${next.route}?${new URLSearchParams({ plan: chosenPlan.id })}`
            : next.route;
          navigate(route, { replace: true });
          if (typeof next.element === 'string' && await waitForTarget(next.element, isCurrent)) {
            if (isCurrent()) {
              if (tour.isActive()) tour.moveTo(index);
              else tour.drive(index);
            }
            return;
          }
          index += direction;
        }
        if (isCurrent()) tour.destroy();
      } finally {
        moving = false;
      }
    }
    void move(0, 1);
  };

  return <WalkthroughContext.Provider value={{ start, active }}>{children}</WalkthroughContext.Provider>;
}
