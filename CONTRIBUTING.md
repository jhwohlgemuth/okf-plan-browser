# Contributing

## Setup

```bash
git clone https://github.com/jhwohlgemuth/okf-plan-browser.git
cd okf-plan-browser
npm ci
npm run dev        # http://localhost:5173
```

Use Chrome or Edge for the File System Access API. The `gh` CLI and `make` are needed for the GitHub tasks below.

## Make tasks

Run `make help` for the full list.

| Task | What it does |
|---|---|
| `make dev` | Start the Vite dev server |
| `make lint` / `make typecheck` / `make test` | ESLint, `tsc`, Vitest |
| `make audit` | `npm audit` on production dependencies (fails on critical) |
| `make build` | Production web build into `dist/` |
| `make ci` | Everything CI runs, locally |
| `make visual` / `make visual-update` | Run or re-baseline visual regression tests; the update also refreshes README screenshots |
| `make tauri-dev` / `make tauri-build` | Desktop app in dev mode, or local installers |
| `make pages-enable` / `make pages-deploy` / `make pages-url` | GitHub Pages setup, deploy, and URL |
| `make release BUMP=patch\|minor\|major` | Bump the version and watch the desktop release build |
| `make release-view` / `release-download` / `release-delete` | Inspect, download, or remove a release (`TAG=vX.Y.Z`) |
| `make runs` / `watch` / `logs` / `ci-status` | Inspect GitHub Actions runs |

## Tests

- **Unit:** `npm test` (Vitest, in `src/**/*.test.ts`).
- **Visual regression:** `npm run test:visual` (Playwright). Baselines live in `e2e/__screenshots__` and are per platform. Use `PW_CHANNEL=msedge` to run on Edge. Update them with `npm run test:visual:update`.

CI runs the audit, lint, type check, tests and build on every pull request.

## Deploy to GitHub Pages

One-time setup: run `make pages-enable`, or open **Settings → Pages → Source → GitHub Actions**.

`deploy-pages.yml` runs on every push to `main`. It builds Vite with the correct base path and deploys `dist/`. The base path comes from the repository name. If the site is served from a custom domain, it appears under `/okf-plan-browser/` there. Run it by hand with `make pages-deploy`.

## Desktop app (Tauri)

Install Rust from <https://rustup.rs>, then:

```bash
npm run tauri:dev     # dev mode
npm run tauri:build   # production binary
```

## Releasing

```bash
make release BUMP=patch   # or minor / major
```

This runs the **Version Bump** workflow, which updates `package.json` and `tauri.conf.json`, commits, tags `vX.Y.Z`, and starts the **Release** workflow. That workflow builds installers for Windows, macOS (Apple Silicon and Intel) and Linux and attaches them to the GitHub release.

- Release builds are unsigned, so operating systems warn on first launch.
- To release an existing tag, run `make release-run TAG=vX.Y.Z`. Pushing a `v*` tag also starts the workflow.
- Check the result with `make release-view TAG=vX.Y.Z`.

## CI and security

- All third-party actions are pinned to commit SHAs. Dependabot keeps them current.
- Workflows default to read-only permissions; write access is granted per job.
- The app ships a strict Content Security Policy, set in `src-tauri/tauri.conf.json` and injected into the web build by `vite.config.ts`. Update both together when adding an external origin. Remote wiki loads need `connect-src` to allow `https:`.
- `npm run dev` proxies `/__forge/{host}/…` to `https://{host}/…` so custom GitLab hosts work from the browser. Restart the dev server after changing the proxy.

## Project structure

```
okf-plan-browser/
├── src/
│   ├── App.tsx, main.tsx, index.css
│   ├── types/wiki.ts          ← TypeScript interfaces for the .wiki format
│   ├── lib/
│   │   ├── wikiParser.ts      ← YAML frontmatter + markdown body parser
│   │   ├── remoteWiki.ts      ← GitHub / GitLab .wiki fetch
│   │   ├── githubToken.ts     ← Optional GitHub PAT in localStorage
│   │   ├── commitWiki.ts      ← Parse + commit a wiki into the store
│   │   ├── handleStore.ts     ← Persists directory handles (IndexedDB) for refresh
│   │   ├── demoData.ts        ← Embedded synthetic plans
│   │   ├── names.ts           ← Project name helpers
│   │   └── utils.ts           ← cn(), truncate(), debounce(), onActivateKey()
│   ├── store/
│   │   ├── planStore.ts       ← Zustand store for plans, repos, filters
│   │   └── themeStore.ts      ← Zustand + persist for theme
│   ├── hooks/
│   │   ├── useFileSystem.ts   ← showDirectoryPicker + drag-drop + remote load
│   │   └── useRefresh.ts      ← One-click wiki refresh (folder handle or forge)
│   ├── test/                  ← Vitest setup and file-handle stubs
│   ├── components/
│   │   ├── ui/                ← shadcn/ui primitives (Radix + CVA)
│   │   ├── Layout.tsx, Sidebar.tsx
│   │   ├── PlanTable.tsx, KanbanBoard.tsx, FilterBar.tsx
│   │   ├── PlanDetailPanel.tsx, Markdown.tsx
│   │   ├── DependencyGraph.tsx ← D3 force-directed
│   │   ├── FolderPicker.tsx, LoadingOverlay.tsx
│   │   ├── StatusBadge.tsx, PriorityBadge.tsx
│   │   └── ErrorFallback.tsx, RouteFallback.tsx, NotFoundPage.tsx
│   └── pages/
│       ├── HomePage.tsx, PortfolioPage.tsx, PhasesPage.tsx
│       └── GraphPage.tsx, SearchPage.tsx, SettingsPage.tsx, AboutPage.tsx
├── e2e/                       ← Playwright visual and refresh tests
├── src-tauri/                 ← Tauri desktop packaging
├── .github/workflows/
│   ├── ci.yml                 ← Audit + lint + typecheck + test + build on PRs
│   ├── deploy-pages.yml       ← Auto-deploy to GitHub Pages on main push
│   ├── release.yml            ← Tauri multi-platform release on version tag
│   └── version-bump.yml       ← Manual version bump workflow
└── scripts/
    └── sync-version.mjs       ← Syncs package.json version → tauri.conf.json
```
