# Review hardening

The October 2026 review's seven high-impact recommendations are implemented in the
application and delivery workflows. The remaining recommendations are indexed in
[`../.wiki/index.md`](../.wiki/index.md).

## Import and persistence contracts

- YAML and restored JSON are validated at the boundary. Invalid optional metadata is
  omitted with a warning rather than passed to string methods or React children.
- Malformed YAML and unreadable files fail the import atomically with filenames and
  reasons. Existing plans remain available. Valid empty refreshes remove stale plans;
  an empty initial import is still rejected.
- Local imports receive opaque IDs. Reopening the same directory handle reuses its
  identity; unrelated folders sharing a name remain separate. Directory-input imports
  are added separately; use Refresh to replace an existing snapshot.
- Remote identities include forge, host, project, and resolved branch. Saved legacy
  remote IDs and plan IDs are migrated together during restoration. Labels remain
  readable and are used in copied agent commands.
- Saved plans are reconstructed from validated metadata and section bodies, rebuilding
  derived search, phase, and link data. Invalid saved entries produce warnings.

## Dependency semantics

The graph and detail panel share exact, case-sensitive relative path resolution within
one repository. Fragments and query strings do not affect the target plan. External URLs
never resolve to an unrelated local plan. Links under dependency/prerequisite headings
are dependency edges; other Markdown links are references. Fenced examples are excluded.
Phase references connect only to a unique owner in the same repository. Ambiguous
references produce no speculative edge.

## Remote resource policy

Browser and desktop loads support cancellation. The Tauri global is explicitly enabled so
runtime detection reaches the native bridge; packaged HTTP app origins are exempt from the
browser-only HTTPS upgrade. Each request has a 30-second deadline;
the overall load has a 120-second deadline. Request responses are limited to 8 MiB,
the operation's transferred response bodies to 32 MiB, decompressed archives to 32 MiB,
individual Markdown files to 2 MiB, and Markdown count to 1,000. Tree traversal is also
bounded by request, page, and depth limits. A limit failure directs the user to a local clone.

Transient 502/503/504 and rate-limit responses receive at most two short retries.
Long Retry-After values are surfaced instead of leaving the interface waiting. Native
responses forward rate-limit headers, enforce streamed size limits, restrict redirects
to the original HTTPS origin, cap redirect count, and support cancelling in-flight work.
An aborted load cannot commit a partially fetched portfolio.

## Delivery checks

Reusable CI runs frontend lint, type checks, unit tests, production build, browser
behavioral tests, and native unit tests on Windows, Linux, Apple Silicon Mac, and Intel Mac.
Node 24 satisfies the installed Vitest engine requirement. Rust is pinned to 1.99.0,
matching the locally verified compiler; dependency resolution is locked.

Pages builds and desktop packaging depend on these checks for the same workflow revision.
Desktop artifacts are assembled into a draft release, checked for existence, then published
only after every packaging job succeeds. macOS jobs use `macos-15` and `macos-15-intel`;
see [GitHub runner documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job).

Screenshot comparisons remain a separate `npm run test:visual` workflow for intentional
visual review. The release gate exercises browser behavior without comparing platform-specific
screenshots. Native unit tests and packaging do not replace real installer interaction tests;
those remain in the existing desktop ingest plan.

## Local verification

- Vitest: metadata, migration, snapshot integrity, repository identity, link resolution,
  remote deadlines, cancellation, limits, and retries.
- Playwright: real directory-input imports, same-name portfolios, malformed metadata search,
  refresh failures and empty refreshes, credential session lifetime, keyboard submission,
  cancellation, and existing sidebar/handle-refresh behavior.
- Native bridge tests: IPC dispatch, credential isolation, and request-ID cancellation.
- Rust: host validation, unsafe URL rejection, response size boundaries, and redirect policy.
- TypeScript, ESLint, production build, and the planning wiki validator.

Time estimates are displayed across planning views, including a sortable Portfolio column
and filtered totals. See [time remaining](time-remaining.md) for calculation rules and limitations.

The final local run passed 96 unit tests, four Rust tests, and 15 browser behavioral cases
(six desktop-only cases were skipped on smaller viewports). Type checking, lint, production
build, workflow YAML parsing, and wiki validation also passed.

Hosted CI and macOS/Linux installer execution require the changes to be pushed; local
verification was performed on Windows.
