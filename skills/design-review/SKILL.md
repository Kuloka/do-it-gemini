---
name: design-review
description: Critique an interface or screenshot against its task and design direction, with ranked visual, responsive, interaction, and accessibility findings supported by evidence.
---

# Design Review

Use for a requested visual/UX critique, a reference comparison, or a quality pass
on an implemented interface. Review is read-only unless fixes are requested.
For a source-code/security review use `code-review`; for implementation use
`frontend-design`. Do not turn a screenshot critique into an unrelated redesign.

## Scope and evidence

Identify the primary task, target users, scope, design contract and reference.
Inspect the actual screenshots or running surface with a real available tool.
For a live UI, record viewport, state and important actions. For a screenshot,
limit claims to visible evidence; do not infer keyboard behavior or working flows.

Read [review rubric](references/review-rubric.md) and assess the aspects relevant
to this brief. Judge the interface against its product and intended direction,
not a universal preference for minimalism, rounded cards or a fashionable font.

## Review in useful order

1. Can the intended person understand and complete the primary task?
2. Does hierarchy/composition make the important content and action clear?
3. Are typography, color, imagery and density coherent and suited to the product?
4. Do the tested narrow, long-content, empty/error and overlay states hold up?
5. Are relevant semantics, focus, keyboard and contrast checks supported by evidence?

Rank findings by user impact. Separate a blocked journey, inaccessible interaction
or broken layout from a polish preference. Do not manufacture issues to fill a
quota. Each finding needs location/state, observation, impact, concrete correction
and a way to recheck. Call a hypothesis a hypothesis.

## Verdict and correction

Use **Ready**, **Needs changes**, or **Unverified** with a short reason and the
scope of evidence. A clean screenshot cannot approve unseen interactions; a
source inspection cannot establish rendered quality. A missing browser is an
explicit verification limit, not a passing visual verdict.

When fixes are authorized, make the highest-impact coherent change, rerender and
exercise affected states. Preserve the chosen direction and working behavior.
Do not silently expand into a different product, new library or full redesign.

Report the strongest findings first and include references to the supporting
view/state or source. Distinguish your self-review from a genuinely independent
review. Finish once requested corrections are verified or remaining gaps are named.
