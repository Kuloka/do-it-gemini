---
name: design
description: Shape a product or interface direction and turn it into an actionable design contract, implementation brief, and visual acceptance criteria.
---

# Design

Use for product/UI direction, a new interface, a redesign, or design decisions that
must survive implementation. The result is a useful interface direction, not a
document written instead of the requested work. For an implementation request,
continue into building and verification; do not stop after a brief.

## 1. Establish the job and evidence

Inspect the current product, routes, tokens, components, content and relevant
screenshots before proposing a style. For a greenfield brief, identify the primary
person, job, decision and action. Distinguish reference evidence from an assumption.
Ask only about gaps that materially change the result; choose reversible defaults
for minor gaps and state them briefly. Do not turn a clear build request into an
extended interview. Preserve a working design system and existing behavior.

Inspect actual available tools before promising browsing, images or delegation.
Read [native capabilities](references/native-capabilities.md) when the host or
verification path is uncertain. A model's product name does not establish tools.

## 2. Choose a specific visual direction

Write a compact direction before coding: audience/task, information hierarchy,
composition, typography, palette roles, imagery and one memorable product-specific
detail. Explain why these decisions suit this product. A seed library, incident
console and legal intake form should not receive the same page with different text.

If the brief leaves the direction open, compare plausible alternatives briefly,
choose one and commit; produce multiple directions only when requested or useful.
If a screenshot or established system is authoritative, match its structure and
relationships rather than introducing an unrelated signature style.

Read [visual language](references/visual-language.md) for concrete composition,
type, color, imagery and density decisions. Use expressive choices where they help
the task, and restraint where clarity or trust dominates. Neither minimalism,
dark mode, gradients, serif headlines nor card grids are universal quality rules.

## 3. Turn direction into a buildable contract

### Durable contract

Use an existing canonical design document. Otherwise maintain root `DESIGN.md`
for a substantial design/build task. A small adjustment needs only a short decision
record near the relevant component, not a new document hierarchy. Preserve useful
existing decisions and identify changed ones explicitly.

Scale the contract to the work; capture concrete decisions rather than filling
every heading with generic advice. Cover what the implementation needs:

- Main user journey, information architecture, content hierarchy and non-goals.
- Chosen visual direction and explicit relationship to product/reference evidence.
- Semantic color, typography, spacing, layout, imagery and motion decisions.
- Existing/new components, their ownership and necessary interaction states.
- Narrow/wide layout behavior, keyboard/focus and accessibility requirements.
- Real data versus clearly labeled demonstration content; unresolved asset needs.
- Implementation constraints and observable acceptance criteria.

The [contract template](assets/design-brief.md) is a starting point, not a mandatory
form. For tokens/components, use `design-system` if available. Do not create a
parallel token layer just to satisfy a skill.

## 4. Build the actual experience

For a requested interface, use `frontend-design` when available, or implement from
the contract using the repository's stack. Finish the primary journey and its
failure/recovery states before polishing secondary decoration. Make controls do
what their labels promise. A visual prototype may use clearly labeled local data;
do not claim a real booking, account, payment or backend integration.

Integrate legitimate supplied or available imagery with appropriate crop/contrast.
Use code-native illustration when that is a better fit. Only invoke image tools
that are actually available; do not substitute fabricated image URLs or emoji for
needed artwork. Inspect generated/downloaded assets before shipping them.

## 5. Look, exercise, refine

Run the UI when the host permits. Inspect a wide and narrow viewport and important
interaction states; include 320 CSS px reflow where relevant. A successful build
does not establish visual quality, and a screenshot does not establish keyboard
behavior. Use [verification](references/verification.md) for the evidence matrix.

Fix the highest-impact observed issue, capture again and compare with the chosen
direction. Inspect hierarchy and composition before adjusting tiny decoration.
Use `design-review` for a structured visual verdict. Respect host browser consent:
a missing browser capability is a recorded validation gap, not a passed check.

Stop when the primary flow works, the chosen direction is visible, relevant
states/reflow/focus checks pass or have precise gaps, and design decisions match
the implementation. Report the result, evidence and remaining limits briefly.
