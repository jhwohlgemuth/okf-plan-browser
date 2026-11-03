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

- Plan: `.wiki/tauri-desktop-ingest.md`; active phase: TD-03; state: blocked on remaining Windows installer validation.
- Authorized scope and decisions: Execute TD-01, TD-02, then TD-03; preserve browser ingest and Tauri 1.x; use the native route only when the Tauri bridge is present.
- Baseline and local work: `bd33614`; clean worktree at phase start; no CodeGraph index. The Apple Silicon WKWebView lacked `showDirectoryPicker`, and its directory-input fallback omitted the hidden `.wiki` child from a selected project folder.
- Verified state: Tauri 1.8.3 now opens a recursively scoped native directory dialog, reads only the selected wiki tree, and lazy-loads scope-checked assets. Typecheck and lint passed; all 116 unit tests, 6 native tests, and the integrity browser suite (26 passed, 16 expected viewport skips) passed; `npm run tauri:build` produced the Apple Silicon app and DMG. Launching `OKF Plan Browser_1.0.0_aarch64.dmg` and importing the repository produced 3 plans plus 1 Epic with no warnings. Evidence: `docs/desktop-ingest.md`.
- Remaining work: Launch and exercise the published `v0.0.2` MSI on Windows, record that row, then retire the plan. Intel macOS is not supported; Linux `.deb` and AppImage validation is complete in `docs/desktop-ingest.md`.
- Budget: TD-01 and TD-02 completed within their phase budgets; TD-03 retains its external-host validation budget.
- Blockers / failed approaches: No interactive Windows host is available. CI compilation does not prove installer interaction.
- Next action: Run the `v0.0.2` MSI smoke on an interactive Windows host.

## Implementation — Portfolio persistence and refresh coordination

- Plan: PS-01 and RF-01 retired after completion; active phase: none; state: complete.
- Authorized scope and decisions: Execute PS-01 and RF-01 serially under their separate integration locks; retain `localStorage` unless representative measurements justify migration.
- Baseline and local work: `fe83490`; clean worktree at phase start; no CodeGraph index is present.
- Verified state: PS-01 is complete: 401 transient updates caused zero serialization and writes; a 1,075,408-character portfolio caused one serialization/write, with Chromium `localStorage` latency of 0.60 ms median and 0.90 ms p95. RF-01 now uses per-repository controllers and generations, cancels only targeted work, invalidates removed sources, and rejects responses older than a refresh or import. All 120 unit tests, typecheck, lint, production build, and the refresh browser matrix passed (4 desktop passes, 8 expected viewport skips).
- Remaining work: None for PS-01 or RF-01.
- Budget: Both phases completed within their five-hour active-time budgets.
- Blockers / failed approaches: The first all-project browser run could not bind the sandboxed preview port; the approved local-server run passed. No implementation blocker remains.
- Next action: Review and commit the implementation when desired.

## Implementation — Planning skill Waza workflow

- Plan: retired after PWZ-01/02/03/04/05/06; active phase: none; state: complete.
- Authorized scope and decisions: Run one model-backed trial per task through GitHub Copilot SDK with CLI model override `grok-4.7`, including provider usage. Keep routing, injected behavior, and truly skill-free baselines distinct; repair validation defects in bounded phases.
- Baseline and local work: `097d187`; the Waza evaluation contracts, real-run interface, contributor documentation, plan surfaces, and durable handoff were updated. Real JSON and retained-workspace paths are preserved under ignored `results/planning/`.
- Verified state: Waza v0.39.1 with GitHub Copilot model `grok-4.7` passed all three portfolio cases and all four implementation/drafting cases after two grader-contract repairs. Focused repair results are at `results/planning/2026-11-02T151459.570/`. The narrowed implicit-routing case passed at 1.00 in `results/planning/routing/2026-11-02T153132.559/`; the explicit `--no-skills` review baseline passed with zero recorded skill invocations in `results/planning/baseline/2026-11-02T153205.369/`. GitHub Actions run 41383771234 passed the pinned offline gate. Final local validation passed readiness, 10/10 strict coverage, both preflights, mock wiring, 18 planning-validator tests, four grader regression tests, wiki validation, and diff checks.
- Remaining work: None; the plan was retired from the portfolio, dependency network, and execution lanes.
- Budget: All phases and bounded repairs completed within their five-hour active-time ceilings; provider and CI waiting were external time.
- Blockers / failed approaches: Built-in Waza `--baseline` still discovered planning in this separated workspace, so the real target now records explicit `--no-skills` and injected runs separately. The original implicit routing prompt timed out after both 300 and 600 seconds despite a passing invocation grader; the repaired read-only routing prompt finished in 1m40s. Program graders verify final artifacts, not transient edits.
- Next action: None; review and commit the completed Waza evaluation workflow when desired.

## Implementation — Planning skill web distribution

- Plan: retired after PSD-01/02/03; active phase: none; state: complete.
- Authorized scope and decisions: Publish the canonical planning skill as a discovered raw tree, deterministic repository-ready ZIP, OpenCode v2 catalog, portable Codex plugin, and immutable release asset. Execute PSD-02 then PSD-03 under their separate locks.
- Baseline and local work: `0c4e097`; implementation checkpoints are `774cdc6`, `30f724d`, `6344bea`, and `715df9e`; no CodeGraph index is present.
- Verified state: PSD-01 publishes the 11-file raw tree, deterministic repository-ready ZIP, and OpenCode v2 catalog; the ZIP SHA-256 is `2d38f3504f96d5786ad93818acd4db6189eba79cdccf1b5d34b7efc39bf5bea2`. PSD-02 adds portable `.agents/plugin.json` and repository marketplace metadata synchronized at version `0.0.1`; manifest/version checks passed, and an isolated Codex CLI 0.166.0 profile installed `planning@okf-plan-browser`, loaded the skill in a fresh session, and returned `5 hours — planning`. PSD-03 makes release publication depend on the planning asset job. [Validation run 41374458325](https://github.com/jhwohlgemuth/okf-plan-browser/actions/runs/41374458325) passed all checks and desktop packages; it uploaded the ZIP and checksum, re-downloaded both from the draft, verified the digest and exact uploaded bytes, and compared the extracted authored files with tag `v0.0.1-psd03`. The validation release remains a draft by design, and stable releases retain their versioned asset URL when the gated publish job changes that same release from draft to public.
- Remaining work: None for PSD-01/02/03.
- Budget: All three phases completed within their five-hour active-time budgets; workflow queue and execution time were external waiting.
- Blockers / failed approaches: Run 41366382617 exposed a stale install-page browser assertion; bounded repair PSD-04 updated it, and the exact CI browser command passed 82 tests with 50 expected skips. Run 41369592304 uploaded the planning assets but an unchanged Intel Tauri build exited 1; run 41372691386 then passed the complete gate. Public unauthenticated draft URLs correctly returned 404, so the final workflow verifies its own downloaded draft assets with its scoped token. A local comparison initially included generated `__pycache__`; matching the collector's exclusion fixed the validation scope. The first clean Codex session could not load cloud policy inside the network sandbox; the approved retry passed.
- Next action: None; review the completed distribution implementation when desired.

## Implementation — Searchable dependency graph

- Plan: retired after GRA-01/02/03; active phase: none; state: complete.
- Authorized scope and decisions: Implement all eight requested graph improvements while retaining D3, bounded animation frames, graph-local filters, and existing plan-detail behavior.
- Baseline and local work: `5109e60`; no CodeGraph index. Incorporated the pre-existing entrypoint-derived three-letter graph IDs and their tests.
- Verified state: Pure transforms cover search, metadata and blocked-path filters, edge filtering, neighborhoods, connections, and stable layouts. The UI adds search cycling, graph-local status/repository/kind/tag/OS filters, edge toggles, one/two-hop emphasis, force/dependency/repository/status/OS layouts, fit/center/minimap navigation, directional edges, previews, URL history, arrow-key relationship movement, live announcements, and an ordered relationship list. Typecheck, lint, all 133 unit tests, production build, and all three desktop graph Playwright scenarios passed. Evidence: `docs/dependency-graph.md`.
- Remaining work: None.
- Budget: GRA-01/02/03 each completed within its five-hour active-time budget.
- Blockers / failed approaches: Node selection initially replaced the SVG trigger before detail focus restoration; explicit ID-based restoration fixed it. A controlled-checkbox Playwright assertion was changed to await URL state after activation. The final sandboxed preview-server bind returned `EPERM`; the authorized rerun passed. No current blocker.
- Next action: Review and commit the completed graph usability implementation when desired.
