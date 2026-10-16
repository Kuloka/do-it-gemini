# Reference matching and existing-product changes

## Establish what is authoritative

Distinguish a screenshot to reproduce, a mood reference, and the current product.
For conflicting sources, use the user's stated priority; ask only when the conflict
would materially change the implementation. Record any missing viewport, state,
font or asset that prevents a reliable comparison. Do not invent a hidden design
system from one screenshot.

For an existing app, inspect the relevant route, surrounding pages, shared layout,
theme variables and reused components. Identify a small set of invariants: page
gutter/container, type roles, action style, navigation, density and token ownership.
Change the requested surface within these rules. A request to improve one form
does not authorize replacing the application shell or adding a new UI library.

## Reconstruct relationships before details

Break the reference into major regions and a reading order. Compare their relative
widths, heights, alignments, spacing and dominant type. Identify actual assets and
crop behavior. Separate these observations from guesses about invisible behavior.

Implement the structural skeleton first. Compare it at the supplied viewport before
adding fine borders, shadows or animation. Reuse existing primitives when they can
match the intended relationship; introduce a local variant when a shared default
would otherwise change unrelated pages. Avoid absolute positioning for normal text
flow merely to match one screenshot.

## Translate into states and narrow layouts

A static reference does not define loading, validation, navigation or overlays.
Use established product behavior and native conventions for unspecified states.
Preserve working keyboard and form behavior through visual changes.

For an unspecified mobile layout, keep the task and hierarchy intact: decide what
stacks, wraps, collapses or scrolls locally. Do not hide required content or shrink
all type until the desktop layout fits. Mark the mobile interpretation as a design
decision rather than claiming it was present in the source reference.

## Compare and finish

Capture the same viewport, content and state when possible. Identify differences
by region: structural proportions, type/line breaks, assets/crop, then decoration.
Fix the largest supported discrepancy first and recheck affected layouts. An image
overlay or pixel diff can locate differences but cannot establish usability or
justify copying a reference defect.

For an existing product, check another consumer of any shared component/token that
changed. Keep untouched conventions intact. Report intentional deviations, missing
assets and untested states explicitly; do not claim reference fidelity from a
different viewport or a source-code inspection.
