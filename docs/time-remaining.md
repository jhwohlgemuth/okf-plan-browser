# Time remaining

Home, Portfolio, Phases, Graph, Search, and plan details display estimated active work remaining. Portfolio has a sortable time column; filtered views total only their visible plans, and Search totals matching plans.

Each executable phase uses the first available value:

1. An explicit `Remaining: 30 minutes`, `Time remaining: 2 hours`, or `Remaining hours: 2` field.
2. A `Budget: 3 hours maximum` field.
3. The plan's numeric `phase_budget_hours` frontmatter value.

Ranges use the upper bound. Hours and minutes are supported, including explicit zero remaining. Fenced examples and incidental prose are ignored. Values are rounded up to whole minutes and approximate durations carry a `~` prefix.

These are effort estimates, not completion dates. In-progress and blocked phases retain their declared effort; the app does not deduct elapsed time or estimate external waiting. Coordination plans are excluded to prevent double counting. Plans without executable phases and phases without estimates are marked unestimated rather than treated as zero. Totals show both known effort and the number of unestimated items.

Estimates are derived from loaded plan content, so refreshes and restored portfolios use the same calculation.
