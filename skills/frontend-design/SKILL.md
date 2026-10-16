---
name: frontend-design
description: Build or redesign distinctive, usable web interfaces with working interactions, deliberate visual hierarchy, responsive behavior, and rendered verification.
---

# Frontend Design

Use when the user asks to build, restyle or finish a web page, component or app.
Deliver functioning implementation, not only a moodboard or suggestions. For a
read-only critique use `design-review`; for product direction use `design` when
the direction is unresolved. A small, clear task should not wait for a large brief.

## Orient and choose

Inspect the repository stack, routes, tokens, components, content and tests. Reuse
the existing system before introducing a different stack or component library.
Read the relevant `DESIGN.md` if present. Preserve specified brand/reference
choices, navigation and working behavior unless the user requests changes.

Write a short build direction: primary task, composition, type hierarchy, semantic
palette, image treatment and a product-specific visual detail. Connect choices to
the content. Do not repeatedly produce the same gradient hero, badge, three cards
and generic dashboard regardless of the brief. These patterns can be appropriate;
use them because the product needs them, not as a substitute for design judgment.

For a reference, reproduce hierarchy, proportions and layout relationships before
adding personal flourishes. For an open brief, choose a coherent direction and
carry it through the whole surface. Avoid collecting alternatives instead of building.
Read [reference and existing-product workflow](references/reference-workflow.md)
when matching screenshots or modifying a product with established visual rules.

## Implement a complete slice

Read [build guide](references/build-guide.md) for implementation choices and
failure states. Establish the main layout and type roles first, then build the
primary journey with real controls. Use realistic content lengths and clearly
identified local demo data. Do not fake successful remote actions or add invented
endorsements, logos, metrics or availability.

Use semantic elements and existing components. Keep design tokens in the existing
source of truth; extract a repeated pattern only when repetition warrants it.
Implement required loading, empty/no-match, invalid input, error and success
states. Preserve user input during recoverable errors. Give every visible action
a real destination or behavior, or label it explicitly as outside the prototype.

Build narrow layout intentionally: stacking/order, navigation, content wrapping,
dialog placement and local overflow. Use fluid constraints rather than an endless
list of hardcoded widths. Respect reduced motion and keyboard use from the start.

Use legitimate supplied/generated assets when available. Specify useful crop,
alt text, aspect ratio and fallbacks. Inspect assets before integration. Use CSS,
SVG or existing icons where that is the appropriate medium. Do not add an image
SDK or external service just to satisfy an aesthetic suggestion.

## Render, exercise, improve

Run the relevant dev/build checks and use an actually available browser path.
Inspect the real result at wide and narrow sizes, including long content and
important states. Then perform the primary interaction, not just a screenshot.
Check focus, errors, overlays, overflow and relevant console/network failures.

Compare the result with the direction/reference. Correct large composition and
hierarchy problems before tweaking decoration. Recheck affected states after a
fix. Use `design-review` if available for an explicit verdict; name a solo review
accurately and do not fabricate independent approval.

If rendering is unavailable, complete the code and appropriate static checks,
then state which visual/interaction checks remain unverified. Never describe an
unseen page as polished or accessible merely because it compiled.

Finish with implemented behavior, material design decisions, verification and
real limitations. Stop when the requested slice works and its design holds up at
the tested states, rather than endlessly adding features or polishing tiny details.
