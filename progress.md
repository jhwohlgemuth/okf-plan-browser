## Implementation — Accessible navigation and graph

- Plan: retired after completion; active phase: none; state: complete.
- Authorized scope and decisions: Implement AX-01 and AX-02 serially under the navigation accessibility lock; keep RP-02 performance work out of scope.
- Baseline and local work: `9dc909d`; pre-existing planning edits in `.wiki/accessible-navigation.md` and `.wiki/index.md` belong to this task.
- Verified state: AX-01 provides a Radix modal drawer on phones with initial focus, containment, Escape/navigation close, trigger restoration, and no closed-drawer controls. AX-02 provides unique named graph buttons, Tab/Enter/Space operation, visible focus, zoom/reset controls, semantic theme colors, a visible keyboard-controls legend, and a resolver-backed relationship list with an empty state. `npm test` passed 98 tests; lint and production build passed; all non-snapshot browser tests passed (24 passed, 15 expected project skips). The legend follow-up passed typecheck, lint, and its two focused graph browser tests.
- Remaining work: None for AX-01/02.
- Budget: Both phases completed within their five-hour budgets.
- Blockers / failed approaches: The repository-wide visual run found 25 stale comparisons across unrelated planning/demo pages and the intentionally changed graph. Snapshots were not overwritten because the current baselines already contain broad unrelated drift. Focused AX tests and the complete non-snapshot browser suite pass.
- Next action: Review and commit the implementation when desired.

## Implementation — Forget folder access when removing saved data

- Plan: retired after completion; active phase: none; state: complete.
- Authorized scope and decisions: Remove portfolio state even when IndexedDB cleanup fails, return an explicit cleanup outcome, warn at user-facing removal controls, and forget handles for all user bulk-clear actions. Internal demo resets remain best-effort.
- Baseline and local work: `260e2a1`; clean worktree at phase start; no CodeGraph index is present.
- Verified state: IndexedDB helpers settle on transaction completion and close their connections; destructive store actions return cleanup outcomes while removing state; Home and Settings surface partial cleanup failures. `npm test` passed 108 tests, typecheck and lint passed, the production build passed, all three desktop refresh/cleanup browser tests passed, and planning wiki validation passed.
- Remaining work: None for FH-01.
- Budget: FH-01 completed within its five-hour active-time budget.
- Blockers / failed approaches: The first failure-path browser assertion matched the warning text as well as the removed row; targeting the removed control resolved the test-only ambiguity.
- Next action: Review and commit the implementation when desired.

## Implementation — Make dropped files match the import interface

- Plan: retired after completion; active phase: none; state: complete.
- Authorized scope and decisions: Accept standalone Markdown files and project/.wiki folders through the drop zone, group standalone files into one named import, and preserve modern and legacy directory behavior without false post-success errors.
- Baseline and local work: `ac89dfe`; clean worktree at phase start; no CodeGraph index is present.
- Verified state: The drop zone synchronously captures modern handles and legacy fallbacks, groups standalone Markdown files into one named import, preserves project/.wiki folder imports, and no longer emits a false file error after legacy directory success. `npm test` passed 110 tests; typecheck, lint, and the production build passed; the full integrity spec passed 23 tests with 10 expected viewport skips; planning wiki validation passed.
- Remaining work: None for FD-01.
- Budget: FD-01 completed within its five-hour active-time budget.
- Blockers / failed approaches: Initial browser assertions matched duplicate sidebar/main labels, and the first synthetic legacy reader recursed by marking its batch consumed after callback. Scoped locators and consuming the batch before callback corrected these test-fixture issues.
- Next action: Review and commit the implementation when desired.

## Implementation — Plan and phase deep links

- Plan: retired after completion; active phase: none; state: complete.
- Authorized scope and decisions: Implement DL-01 then DL-02 under the selection-routing lock. Use `?plan=<stable plan id>` plus a canonical hash anchor; preserve repository identity and the existing AX work.
- Baseline and local work: `9dc909d` with the uncommitted completed AX implementation already in the worktree. No CodeGraph index is present. At phase start, typecheck, lint, resolver tests (7/7), and desktop integrity browser tests (5/5) passed.
- Verified state: DL-01 represents selection as `?plan=<ParsedPlan.id>`, restores it after reload, follows close/Back/Forward history, preserves unrelated query state, and renders a graceful missing-plan panel. DL-02 gives plan sections, Markdown headings, and phases canonical anchors; phase cards and repository-aware Markdown links open those anchors; reload and history navigation restore scroll and keyboard focus. Typecheck and lint pass, all 99 unit tests pass, production build passes, all seven desktop integrity tests pass, and the complete non-visual browser suite passes (26 passed, 19 expected project skips).
- Remaining work: None for DL-01/02.
- Budget: Both phases completed within their five-hour budgets.
- Blockers / failed approaches: The first reciprocal-effect implementation raced on history navigation; a guarded store subscription plus native popstate reconciliation resolved it. Cross-plan focus initially ran before the final router location commit; keying focus restoration to the committed hash resolved it. No current blocker.
- Next action: Review and commit the implementation when desired.

## Implementation — Rendering performance

- Plan: `.wiki/rendering-performance.md` retired after RP-01/02; active phase: none; state: complete.
- Authorized scope and decisions: Execute both RP phases serially. Keep the existing graph interaction and zoom controls.
- Baseline and local work: `0ae3009`; clean worktree at phase start; no CodeGraph index present.
- Verified state: Document rendering loads on first detail open with a visible fallback and a restricted code-language set. The graph advances in bounded animation frames and recenters on resize while retaining zoom. Build and transfer measurements plus representative graph benchmarks are in `docs/rendering-performance.md`. Focused layout unit and browser integrity/graph checks passed.
- Remaining work: None for RP-01/02.
- Budget: Both phases completed within their five-hour active-time budgets.
- Blockers / failed approaches: A browser assertion initially used an inaccessible status name; a visible-text assertion resolved the test-only issue. No current blocker.
- Next action: Review and commit the implementation when desired.

## Implementation — Slash-containing remote branches

- Plan: `.wiki/remote-branch-selection.md` retired after RB-01; active phase: none; state: complete.
- Authorized scope and decisions: Implement RB-01 under the remote source selection lock. An explicit Branch/ref overrides URL inference; ambiguous tree/blob paths require that field.
- Baseline and local work: `f3ed112`; clean worktree at phase start; no CodeGraph index present.
- Verified state: The field passes slash-containing refs to GitHub and GitLab with encoded API paths and distinct source IDs. Unit tests cover parsing, identity, and both forge requests; a browser test covers the ambiguous URL message and successful override. `npm test -- src/lib/remoteWiki.test.ts` passed 20 tests; typecheck and lint passed; `npx playwright test e2e/integrity.spec.ts` passed 26 tests with 16 expected viewport skips.
- Remaining work: None for RB-01.
- Budget: Completed within the five-hour active-time budget.
- Blockers / failed approaches: None.
- Next action: Review and commit the implementation when desired.
