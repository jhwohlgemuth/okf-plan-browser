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

## Implementation — Desktop folder ingest

- Plan: `.wiki/tauri-desktop-ingest.md`; active phase: TD-03; state: blocked on remaining external installer validation.
- Authorized scope and decisions: Execute TD-01, TD-02, then TD-03; preserve browser ingest and Tauri 1.x; use the native route only when the Tauri bridge is present.
- Baseline and local work: `bd33614`; clean worktree at phase start; no CodeGraph index. The Apple Silicon WKWebView lacked `showDirectoryPicker`, and its directory-input fallback omitted the hidden `.wiki` child from a selected project folder.
- Verified state: Tauri 1.8.3 now opens a recursively scoped native directory dialog, reads only the selected wiki tree, and lazy-loads scope-checked assets. Typecheck and lint passed; all 116 unit tests, 6 native tests, and the integrity browser suite (26 passed, 16 expected viewport skips) passed; `npm run tauri:build` produced the Apple Silicon app and DMG. Launching `OKF Plan Browser_1.0.0_aarch64.dmg` and importing the repository produced 3 plans plus 1 Epic with no warnings. Evidence: `docs/desktop-ingest.md`.
- Remaining work: Launch and exercise the published `v0.0.1` artifacts on Windows and Linux, record host details and results, then retire the plan. Intel macOS is not supported.
- Budget: TD-01 and TD-02 completed within their phase budgets; TD-03 retains its external-host validation budget.
- Blockers / failed approaches: The packages are published, but no interactive Windows or Linux hosts are available in this workspace. CI compilation does not prove installer interaction.
- Next action: Download the published packages to Windows and Linux hosts and run the TD-03 smoke matrix.

## Implementation — Portfolio persistence and refresh coordination

- Plan: PS-01 and RF-01 retired after completion; active phase: none; state: complete.
- Authorized scope and decisions: Execute PS-01 and RF-01 serially under their separate integration locks; retain `localStorage` unless representative measurements justify migration.
- Baseline and local work: `fe83490`; clean worktree at phase start; no CodeGraph index is present.
- Verified state: PS-01 is complete: 401 transient updates caused zero serialization and writes; a 1,075,408-character portfolio caused one serialization/write, with Chromium `localStorage` latency of 0.60 ms median and 0.90 ms p95. RF-01 now uses per-repository controllers and generations, cancels only targeted work, invalidates removed sources, and rejects responses older than a refresh or import. All 120 unit tests, typecheck, lint, production build, and the refresh browser matrix passed (4 desktop passes, 8 expected viewport skips).
- Remaining work: None for PS-01 or RF-01.
- Budget: Both phases completed within their five-hour active-time budgets.
- Blockers / failed approaches: The first all-project browser run could not bind the sandboxed preview port; the approved local-server run passed. No implementation blocker remains.
- Next action: Review and commit the implementation when desired.

## Implementation — Standalone release artifacts

- Plan: `.wiki/linux-release-exports.md`; active phase: LX-02; state: blocked on interactive Linux host validation.
- Authorized scope and decisions: Require both Linux exports and every existing desktop installer on GitHub Releases before publication; generate release checksums. Preserve the existing release targets, including the legacy Intel DMG.
- Baseline and local work: `8e9287a`; the four distribution plans and portfolio index edits were pre-existing uncommitted work from the planning request. This implementation changed `.github/workflows/release.yml`, `CONTRIBUTING.md`, this progress section, and LX-01 evidence.
- Verified state: [run 41144436883](https://github.com/jhwohlgemuth/okf-plan-browser/actions/runs/41144436883) at `346ce14` passed CI, all four packaging/upload jobs, and publication. The public [`v0.0.1` release](https://github.com/jhwohlgemuth/okf-plan-browser/releases/tag/v0.0.1) has five canonical installers plus five `.sha256` sidecars; each sidecar's checksum matches the corresponding GitHub asset digest. LX-01 is complete. Acorn-style `version`, `check-version`, and `release-version` Make targets are on `main`. The Tauri action also uploaded redundant default-named bundles; a follow-up workflow change uses the CLI directly on future releases.
- Remaining work: Run Linux installation, AppImage launch, and native folder-import smoke tests on an interactive host, and record the observed distribution and support floor for LX-02.
- Budget: LX-01 completed within its five-hour active-time budget; LX-02 retains its five-hour budget. External CI waiting did not count as active work.
- Blockers / failed approaches: No interactive Linux host is available in this workspace. Earlier API and draft download gates failed before publication; per-platform checksum sidecars resolved the release gate.
- Next action: Download the two canonical Linux packages and sidecars to a supported interactive Linux host, verify checksums, install and remove the `.deb`, launch the AppImage, and exercise folder import.
