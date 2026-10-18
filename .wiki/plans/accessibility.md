---
type: Plan
title: Every control is keyboard reachable and the detail panel is a real dialog
description: Give interactive rows, cards, and filter toggles proper roles and keyboard handling, and make the detail panel a focus-managed dialog.
difficulty: medium
impact: high
package: [okf-plan-browser]
tags: [accessibility, keyboard, aria, dialog, eslint]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Make every action in the app reachable and operable from the keyboard alone, and give the
detail panel the dialog semantics that `src/components/ui/dialog.tsx` already provides.

# Current evidence

Click handlers sit on elements with no interactive role and no keyboard path:
`src/components/PlanTable.tsx:101` binds `onClick` to a table row,
`src/components/KanbanBoard.tsx:78` and `src/pages/SearchPage.tsx:123` bind it to card
divs, and `src/pages/SearchPage.tsx:125` opens the detail panel from a div. The sortable
headers at `src/components/PlanTable.tsx:68-77` are click-only and expose no `aria-sort`, so
a screen reader cannot report the current sort column or direction.

The filter toggles at `src/components/FilterBar.tsx:25` and the repo toggles at `:91` and
`:115` convey selection through colour alone and expose no `aria-pressed`.

`src/components/PlanDetailPanel.tsx` renders a full-screen modal with a backdrop at `:53`
and a panel at `:62`, closes on Escape at `:42-46`, but sets no `role="dialog"`, no
`aria-modal`, no label, and performs no focus trap or focus restore. The Radix dialog used
in `src/components/FolderPicker.tsx:80` already does all of this correctly, so the
inconsistency is internal rather than a missing capability.

`.eslintrc.cjs` extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, and
`plugin:react-hooks/recommended`, and installs no accessibility plugin, so none of the above
is currently caught. `ci.yml` runs `npm run lint` with `--max-warnings 0`.

# Boundaries

- No visual redesign. Restyle only where a role change alters the element.
- No redesign of the plan table into a grid; roles stay on the existing table elements.
- No screen-reader testing harness in this plan.

# Dependencies and stop gates

- No upstream blocker. AX-02 should follow AX-01 so the row and card interaction pattern is
  settled before the panel adopts it.
- Requires the CI lint job from TS-01 to be in place, since AX-03 turns a lint rule into a
  required check.

# Decisions

- Plan rows become focusable rows with `Enter` and `Space` activation rather than buttons, to
  preserve the table layout that `src/components/PlanTable.tsx:81` already provides.
- The detail panel adopts the Radix `Dialog` primitive that `src/components/FolderPicker.tsx`
  already uses, rather than hand-rolling focus management onto `AnimatePresence`.
- `eslint-plugin-jsx-a11y` is added and its rules become errors, not warnings, so the
  remaining primitives are held in place by CI.

# Validation

`npm run lint` passes with the new rules enabled, and a keyboard-only pass reaches every
control on the home, portfolio, phase, graph, and search pages.

# Acceptance criteria

- Every clickable row, card, and result opens the detail panel from the keyboard.
- Sortable headers expose their column and direction through `aria-sort`.
- Filter and repo toggles expose their state through `aria-pressed` and are not colour-only.
- The detail panel is a labelled modal dialog with a focus trap and focus restoration.
- `eslint-plugin-jsx-a11y` is installed and its findings fail the lint job.

# Execution phases

## AX-01 — Keyboard and semantics for interactive rows, cards, and results

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: none
- Exact write set: `src/components/PlanTable.tsx`, `src/components/KanbanBoard.tsx`, `src/pages/SearchPage.tsx`
- Primary integration lock: plan selection interaction contract
- Outcome: Portfolio rows, phase cards, and search results are focusable, expose a button or link role, open the detail panel on `Enter` and `Space`, and show a visible focus ring.
- Focused validation: `npm run typecheck` and a keyboard-only pass over the three pages
- Handoff: Record the shared activation helper introduced, then mark AX-02 ready.

## AX-02 — Detail panel becomes a labelled modal dialog

- Status: planned
- Budget: 4 hours maximum
- Prerequisites: AX-01
- Exact write set: `src/components/PlanDetailPanel.tsx`
- Primary integration lock: plan selection interaction contract
- Outcome: The panel renders with `role="dialog"`, `aria-modal`, an accessible name from the plan title, a focus trap, focus restoration to the triggering control on close, and its existing Escape and backdrop behaviour.
- Focused validation: `npm run typecheck` and a keyboard-only open-and-close pass from the portfolio table
- Handoff: Record the focus entry and restoration targets, then mark AX-03 ready.

## AX-03 — State exposed on filter toggles and enforced by lint

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: AX-02
- Exact write set: `src/components/FilterBar.tsx`, `.eslintrc.cjs`, `package.json`
- Primary integration lock: lint rule set
- Outcome: Status, priority, impact, difficulty, repo, tag, and package toggles expose `aria-pressed`, and `eslint-plugin-jsx-a11y` runs in CI with its findings failing the lint job.
- Focused validation: `npm run lint`
- Handoff: Record the enabled rule set and the existing findings resolved, then delete this plan once its criteria hold.