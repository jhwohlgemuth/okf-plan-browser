# OKF Plan Browser

> A web + desktop application for browsing, visualising, and searching `.wiki` markdown planning portfolios — built with React, Vite, shadcn/ui, and Tauri.

![CI](https://github.com/jhwohlgemuth/okf-plan-browser/actions/workflows/ci.yml/badge.svg)
![Pages](https://github.com/jhwohlgemuth/okf-plan-browser/actions/workflows/deploy-pages.yml/badge.svg)

🌐 **Live demo:** `https://jhwohlgemuth.github.io/okf-plan-browser/`

---

## Features

| View | What it does |
|---|---|
| **Portfolio** | Sortable, filterable table of all plans — by status, priority, impact, difficulty, tags, packages, repo |
| **Phase Tracker** | Kanban board across `planned → ready → blocked → in-progress` |
| **Dependency Graph** | D3 force-directed graph — nodes are plans, edges are `.md` links and `PA-XX` cross-references |
| **Search** | Full-text across titles, descriptions, section content, tags, packages, and phase titles |

- 🌙 **One Dark theme** with Light / System toggle (persisted across sessions)
- 📂 **File System Access API** (`showDirectoryPicker`) + drag-and-drop fallback
- 🗂️ **Multiple repos** — "Add another .wiki" merges data with distinct repo colour labels
- 🖱️ **Slide-in detail panel** — click any plan for full frontmatter, sections, phases, dependencies
- 🎭 **Embedded demo data** — 6 synthetic plans load instantly with no files required
- 🖥️ **Optional Tauri desktop app** — native window, no Electron overhead
- ⚙️ **GitHub Actions** — CI, GitHub Pages deploy, multi-platform Tauri release, automated versioning

---

## Your `.wiki` format

The app reads plain markdown files with YAML frontmatter:

```markdown
---
type: Plan
title: "My Plan Title"
description: "What this is about"
difficulty: medium          # easy | medium | hard
impact: critical            # low | medium | high | critical
package: [workspace, acorn-lib]
tags: [feature, automation]
status: planned             # planned | in-progress | blocked
priority: next              # next | high | medium | low
execution: phased           # phased | coordination
phase_budget_hours: 5
---

# Goal
Narrative context...

# Current evidence
- Bullet log

## PA-01 Phase title
**Status:** planned
Phase body with cross-references like PA-02, PA-03...

# Dependencies and stop gates
- [Other plan](../other-repo/.wiki/other-plan.md)
```

**Notes:**
- Status values are `planned | in-progress | blocked` — completed plans are **deleted** from `.wiki/`, not marked done.
- Phase IDs follow the pattern `PA-01`, `PA-02`, etc. (or `1.`, `2.` numbered variants).
- Dependency links use standard markdown: `[text](../relative/path.md)`.
- Each repo has one `.wiki/` root folder containing multiple `.md` plan files.

---

## Quick start

```bash
git clone https://github.com/jhwohlgemuth/okf-plan-browser.git
cd okf-plan-browser
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge. Click **Open .wiki Folder** and pick any `.wiki/` directory, or click **Load Demo Data** to explore immediately.

---

## Deploy to GitHub Pages

### First-time setup

```bash
# 1. Create a new repo on GitHub, then:
git init
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/jhwohlgemuth/okf-plan-browser.git
git branch -M main
git push -u origin main
```

In your repo → **Settings → Pages → Source → GitHub Actions**.

The `deploy-pages.yml` workflow runs automatically on every push to `main`. It builds Vite with the correct base path and deploys `dist/` to Pages.

### Update `REPO_NAME`

If your repo is not named `okf-plan-browser`, update the `REPO_NAME` env var in `deploy-pages.yml`, or leave it and let the workflow detect it automatically via `github.event.repository.name`.

---

## Desktop app (Tauri)

```bash
# Install Rust: https://rustup.rs
npm run tauri:dev     # dev mode
npm run tauri:build   # production binary
```

Tauri builds produce native installers (`.deb`, `.msi`, `.dmg`) via the `release.yml` workflow when you push a version tag:

```bash
npm run version:patch   # bumps 1.0.0 → 1.0.1
# commit + push, then:
git tag v1.0.1 && git push origin v1.0.1
```

---

## Project structure

```
okf-plan-browser/
├── src/
│   ├── types/wiki.ts          ← TypeScript interfaces for the .wiki format
│   ├── lib/
│   │   ├── wikiParser.ts      ← YAML frontmatter + markdown body parser
│   │   ├── demoData.ts        ← 6 embedded synthetic plans
│   │   └── utils.ts           ← cn(), truncate(), debounce()
│   ├── store/
│   │   ├── planStore.ts       ← Zustand store for plans, repos, filters
│   │   └── themeStore.ts      ← Zustand + persist for theme
│   ├── hooks/
│   │   ├── useFileSystem.ts   ← showDirectoryPicker + drag-drop
│   │   └── useTheme.ts        ← syncs theme store to DOM
│   ├── components/
│   │   ├── ui/                ← shadcn/ui primitives (Radix + CVA)
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── PlanTable.tsx
│   │   ├── PlanDetailPanel.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── DependencyGraph.tsx ← D3 force-directed
│   │   ├── FilterBar.tsx
│   │   ├── FolderPicker.tsx
│   │   ├── StatusBadge.tsx
│   │   └── PriorityBadge.tsx
│   └── pages/
│       ├── HomePage.tsx
│       ├── PortfolioPage.tsx
│       ├── PhasesPage.tsx
│       ├── GraphPage.tsx
│       ├── SearchPage.tsx
│       └── SettingsPage.tsx
├── src-tauri/                 ← Tauri desktop packaging
├── .github/workflows/
│   ├── ci.yml                 ← Lint + typecheck + build on PRs
│   ├── deploy-pages.yml       ← Auto-deploy to GitHub Pages on main push
│   ├── release.yml            ← Tauri multi-platform release on version tag
│   └── version-bump.yml       ← Manual version bump workflow
└── scripts/
    └── sync-version.mjs       ← Syncs package.json version → tauri.conf.json
```

---

## Tech stack

| Layer | Library |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Language | TypeScript 5.3 |
| Styling | Tailwind CSS 3 + One Dark palette |
| Components | shadcn/ui (Radix primitives + CVA) |
| State | Zustand 4 (with persist middleware) |
| Graph | D3 7 (force simulation) |
| YAML | js-yaml 4 |
| Icons | Lucide React |
| Animation | Framer Motion |
| Desktop | Tauri 1.6 (optional) |

---

## Browser compatibility

The **File System Access API** (`showDirectoryPicker`) is required to load `.wiki` folders directly. It is supported in:

- ✅ Chrome 86+
- ✅ Edge 86+
- ❌ Firefox (drag-and-drop works via `getAsFileSystemHandle` where available)
- ❌ Safari

The demo data and all other features work in all modern browsers.

---

## License

MIT
