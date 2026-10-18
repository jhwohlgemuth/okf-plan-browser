import { parseWikiFile } from './wikiParser';
import type { ParsedPlan } from '@/types/wiki';

// ─── Raw demo markdown strings ────────────────────────────────────────────────

const DEMO_RAW: Array<{ repo: string; name: string; md: string }> = [
  {
    repo: 'acorn-core',
    name: 'api-versioning-strategy.md',
    md: `---
type: Plan
title: "Implement API Versioning Strategy"
description: "Design and roll out a versioned REST API layer with semver routing, deprecation headers, and migration guides."
difficulty: hard
impact: critical
package: [acorn-core, acorn-cli, acorn-schema]
tags: [api, versioning, breaking-change, architecture]
status: in-progress
priority: next
execution: phased
phase_budget_hours: 12
---

# Goal
Establish a durable versioning contract so clients can pin to a major version while we ship breaking changes on new majors. The versioning layer must be transparent to consumers via standard \`Accept\` headers and unambiguous \`Deprecation\` / \`Sunset\` response headers.

# Current evidence
- v1 endpoints are unversioned and breaking changes have already broken two downstream consumers.
- RFC 7089 and RFC 8594 define the deprecation/sunset header convention — adopted as the standard.
- [Schema contract freeze](./schema-contract-freeze.md) must land before versioned routing can route correctly.

## PA-01 Freeze v1 schema contracts
**Status:** in-progress
All v1 field names, types, and required/optional flags locked in \`SCHEMA_V1.md\`. No new fields until v2 branch opens. Refs: PA-02, PA-03.

## PA-02 Implement semver router middleware
**Status:** planned
Express middleware that inspects \`Accept: application/vnd.acorn.v{N}+json\` and dispatches to the correct handler set. Falls back to latest stable if header absent.

## PA-03 Add Deprecation + Sunset headers
**Status:** planned
Inject \`Deprecation\` and \`Sunset\` headers on all v1 routes once v2 ships. Sunset date = 90 days post v2 GA.

# Architecture decisions
Chose header-based versioning over URL path (\`/v1/\`) to keep URLs stable and allow content negotiation. Clients that do not send a version header receive the latest stable version with a \`Warning\` header.

# Dependencies and stop gates
- [Schema contract freeze](./schema-contract-freeze.md) — PA-01 blocks PA-02
- [CLI consumer audit](../acorn-cli/.wiki/cli-consumer-audit.md)
`,
  },
  {
    repo: 'acorn-core',
    name: 'schema-contract-freeze.md',
    md: `---
type: Plan
title: "Schema Contract Freeze v1"
description: "Lock all v1 field names and types before the versioning router ships."
difficulty: medium
impact: high
package: [acorn-schema]
tags: [schema, contract, freeze, api]
status: planned
priority: high
execution: coordination
phase_budget_hours: 4
---

# Goal
Produce a machine-readable \`SCHEMA_V1.json\` and a human-readable \`SCHEMA_V1.md\` that both serve as the canonical source of truth for all v1 API shapes. Any change to these files after freeze requires a v2 branch.

# Current evidence
- Current schema lives in scattered TypeScript interfaces with no central registry.
- [API versioning strategy](./api-versioning-strategy.md) depends on this plan completing first.

## 1. Audit existing interfaces
**Status:** planned
Walk every \`src/**/types.ts\` file and extract all exported interfaces into a spreadsheet for review. Target: zero undocumented fields.

## 2. Write SCHEMA_V1.json
**Status:** planned
JSON Schema draft-07 file auto-generated from audited interfaces via \`ts-json-schema-generator\`.

## 3. Ratify and tag
**Status:** planned
Team review, merge to main, tag \`schema-v1.0.0\`. Freeze enforced via CI lint rule.

# Dependencies and stop gates
No external dependencies. This plan is a prerequisite for [API versioning strategy](./api-versioning-strategy.md).
`,
  },
  {
    repo: 'acorn-core',
    name: 'telemetry-pipeline.md',
    md: `---
type: Plan
title: "Build Internal Telemetry Pipeline"
description: "Ship structured event logging from CLI and daemon, route to a local aggregator, and expose a metrics endpoint for Grafana."
difficulty: hard
impact: high
package: [acorn-core, acorn-cli]
tags: [telemetry, observability, metrics, logging]
status: blocked
priority: medium
execution: phased
phase_budget_hours: 20
---

# Goal
Every significant user action and background job emits a structured JSON event. Events are buffered locally, flushed to an aggregator on a configurable interval, and queryable via a \`/metrics\` Prometheus endpoint.

# Current evidence
- Node.js process crashes currently produce no structured output — only unhandled rejection logs.
- [API versioning strategy](./api-versioning-strategy.md) must land first because the telemetry envelope includes an API version tag.
- Blocked on infrastructure: aggregator host not provisioned. Tracked in PA-10.

## PA-10 Provision aggregator host
**Status:** blocked
Waiting on infra team to provision the VPS. ETA unknown. Refs: PA-11.

## PA-11 Implement event emitter module
**Status:** planned
\`@acorn/telemetry\` package — thin wrapper over structured JSON writes to a ring buffer. Refs: PA-12.

## PA-12 Prometheus metrics endpoint
**Status:** planned
Scrape ring buffer on \`GET /metrics\`. Expose counters for events by type. Refs: PA-13.

## PA-13 Grafana dashboard template
**Status:** planned
JSON dashboard definition committed to the repo. Import instructions in README.

# Dependencies and stop gates
- [API versioning strategy](./api-versioning-strategy.md) — telemetry envelope version tag
- Infra provisioning (external, tracked in PA-10)
`,
  },
  {
    repo: 'acorn-cli',
    name: 'cli-consumer-audit.md',
    md: `---
type: Plan
title: "CLI Consumer Audit Before v2"
description: "Enumerate all public CLI commands and flags consumed by external scripts and CI pipelines before any breaking API changes land."
difficulty: easy
impact: medium
package: [acorn-cli]
tags: [cli, audit, compat, breaking-change]
status: planned
priority: high
execution: coordination
phase_budget_hours: 6
---

# Goal
Produce an inventory of every \`acorn\` CLI command, flag, and output format that external consumers depend on. This inventory gates the v2 migration guide and the deprecation schedule.

# Current evidence
- The CLI has 23 top-level commands. Usage telemetry is absent — audit is manual.
- [API versioning strategy](../acorn-core/.wiki/api-versioning-strategy.md) references this plan as a stop gate for the Sunset header timeline.

## 1. Scrape CI pipeline usages
**Status:** planned
\`grep -r "acorn "\` across all known consumer repos. Output to \`audit/ci-usages.csv\`.

## 2. Document output formats
**Status:** planned
For each command: document default output, \`--json\` flag behaviour, exit codes.

## 3. Publish compatibility matrix
**Status:** planned
\`COMPAT.md\` — command × flag × version matrix. Linked from the migration guide.

# Dependencies and stop gates
- Requires read access to consumer repos (internal GitHub org).
`,
  },
  {
    repo: 'acorn-ui',
    name: 'design-token-migration.md',
    md: `---
type: Plan
title: "Migrate to Semantic Design Tokens"
description: "Replace hardcoded hex colours and pixel values with a token system compatible with both light and dark themes and the upcoming brand refresh."
difficulty: medium
impact: medium
package: [acorn-ui, acorn-storybook]
tags: [design, tokens, theming, css, accessibility]
status: in-progress
priority: medium
execution: phased
phase_budget_hours: 8
---

# Goal
Every UI component sources colour, spacing, and typography from a single token set defined in \`tokens.json\` (per the W3C Design Tokens Community Group draft format). The token pipeline compiles to CSS custom properties for web and to Kotlin/Swift constants for mobile.

# Current evidence
- ~340 hardcoded \`#hex\` values found across 62 component files in the last audit.
- WCAG AA contrast checked on the proposed primary palette — all pairs pass at the 4.5:1 ratio.

## PA-20 Audit existing hardcoded values
**Status:** in-progress
\`stylelint --fix\` pass complete. Remaining manual fixes: 47 Tailwind \`bg-[#hex]\` usages. Refs: PA-21.

## PA-21 Define token schema
**Status:** planned
\`tokens.json\` in W3C DTCG draft format. Covers colour, spacing (4px grid), radii, shadows, typography scale. Refs: PA-22.

## PA-22 Build compilation pipeline
**Status:** planned
\`style-dictionary\` config targeting CSS vars + Kotlin + Swift. Runs in CI on token file changes. Refs: PA-23.

## PA-23 Migrate components
**Status:** planned
Replace hardcoded values component-by-component. Storybook visual regression tests gate each PR.

# Dependencies and stop gates
- Brand refresh sign-off (design team, expected Q4).
- No code dependencies — can proceed in parallel with other plans.
`,
  },
  {
    repo: 'acorn-ui',
    name: 'storybook-visual-regression.md',
    md: `---
type: Plan
title: "Storybook Visual Regression Testing"
description: "Add Chromatic-based visual regression snapshots for all UI components, integrated into the PR review workflow."
difficulty: medium
impact: medium
package: [acorn-ui, acorn-storybook]
tags: [testing, storybook, visual-regression, ci, chromatic]
status: planned
priority: low
execution: phased
phase_budget_hours: 10
---

# Goal
Every component story has a baseline snapshot stored in Chromatic. PRs that change pixel output require explicit approval before merge. This gates the [design token migration](./design-token-migration.md) and any future theming work.

# Current evidence
- Storybook 7.6 already configured with 142 stories across 38 components.
- Chromatic free tier covers 5 000 snapshots/month — sufficient for current story count.

## 1. Connect Chromatic project
**Status:** planned
\`npx chromatic --project-token=...\` first run establishes all baselines. Store token in GitHub Actions secret.

## 2. Add CI workflow step
**Status:** planned
\`chromatic\` step in PR workflow. Blocks merge on unreviewed changes. Auto-accept on \`main\` to update baselines.

## 3. Document review process
**Status:** planned
CONTRIBUTING.md section: how to review diffs, when to auto-accept, how to update baselines intentionally.

# Dependencies and stop gates
- No code dependencies.
- Enables [design token migration](./design-token-migration.md) — provides the regression safety net.
`,
  },
];

// ─── Parse all demo plans ─────────────────────────────────────────────────────

export const DEMO_PLANS: ParsedPlan[] = DEMO_RAW.map(({ repo, name, md }) =>
  parseWikiFile(repo, name, md),
);

export const DEMO_REPOS = [
  { id: 'acorn-core', label: 'acorn-core', color: '#61afef' as const, planCount: 3 },
  { id: 'acorn-cli',  label: 'acorn-cli',  color: '#98c379' as const, planCount: 1 },
  { id: 'acorn-ui',  label: 'acorn-ui',   color: '#e5c07b' as const, planCount: 2 },
];
