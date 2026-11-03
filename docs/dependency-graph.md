# Dependency graph navigation

The dependency graph is a local exploration surface for the currently loaded portfolio. Its
controls do not change the filters used by Portfolio, Phase Tracker, or Search.

## Find and focus work

- Search matches the three-letter graph ID, title, tags, repository, status, package, and operating
  system labels. Press **Enter** to cycle forward through results or **Shift+Enter** to cycle back.
- The selected node is centered, focused, and pulsed. Choose a one-hop or two-hop neighborhood to
  dim unrelated nodes without removing the surrounding graph.
- Arrow keys move from a focused node to one of its visible connected nodes. Enter or Space opens
  the plan detail panel.
- The preview reports the plan status, next phase, blocked phases, tags, and visible incoming and
  outgoing edge counts. The ordered relationship list provides the same connections outside SVG.
  Each connected-node card mirrors Phase Tracker details: description, next phase and estimate,
  Plan/Epic kind, plan status, priority, impact, blocked-phase count, repository, and tags.

## Filter and arrange the graph

Status, repository, Plan/Epic kind, tag/OS, and blocked-path filters are graph-local. Dependency and
reference edges can be hidden independently. A blocked path includes a blocked plan or phase and
the plans connected to it through resolved dependency edges.

Five layouts are available:

| Layout | Use |
| --- | --- |
| Force | Explore the natural relationship clusters. |
| Dependency | Read dependency depth from left to right. Cycles settle into bounded columns. |
| Repository | Compare repository-owned groups. |
| Status | Scan execution state groups. |
| Operating system | Isolate platform-conditioned work from unlabelled work. |

Zoom controls support zoom in, zoom out, reset, fit-all, and center-selection. The minimap shows the
current node distribution and viewport; activating it fits the graph.

## Shareable state

Durable graph state is stored in the URL so browser Back/Forward and copied links restore it:

| Parameter | Meaning |
| --- | --- |
| `gq` | Graph search query |
| `gstatus`, `grepo`, `gkind`, `gtag` | Comma-separated local filters |
| `gblocked` | Blocked-path shortcut (`1`) |
| `gedges` | Visible edge types (`dep`, `ref`, or `none`) |
| `ghops` | Neighborhood distance (`1` or `2`) |
| `glayout` | Non-default layout |
| `gplan` | Selected plan ID |

Hover state, drag positions, zoom transforms, and animations remain transient. A URL can retain its
controls across reload even when the underlying local portfolio is not available on the next load;
once the same portfolio is restored, matching nodes and selection resolve again.

## Relationship direction

An edge points from the plan containing the link to its resolved target. For the selected node,
green edges are incoming and yellow edges are outgoing. Solid blue edges are explicit dependency
links; dashed neutral edges are plan or phase references. Edge text appears for relationships
incident to the selected node.
