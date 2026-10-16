# Browser QA by user outcome

Use this reference for frontend, interaction, and visual QA. Select relevant checks;
do not turn a small change into an unrelated audit. Read `DESIGN.md` or the supplied
reference before judging visual differences. Record the route, viewport, browser,
fixture state, and any screenshot path so another person can reproduce a finding.

## Establish an honest test surface

Use an available browser tool or the project's installed browser test framework.
Start the application with its documented command and wait for an actual ready signal.
Prefer role/name or stable project selectors to brittle DOM traversal. Wait for the
specific state or response instead of arbitrary sleeps. If tools cannot drive a
browser, run relevant component/integration checks and report the untested UI paths.

## Core journey and states

Complete the main user action from its real entry point, including validation and
success feedback. Confirm the resulting data or route, not only a success toast.
Inspect loading, empty, populated, error, and disabled states when the change touches
them. Trigger a controlled request failure and retry when recovery is in scope.
Check that rapid navigation or repeated submission does not duplicate writes or
allow an old response to replace newer results. Use isolated records, not real accounts.

## Responsive and visual behavior

- Test representative narrow and wide viewports, then a width near the changed
  layout's actual breakpoint. Inspect intermediate widths when wrapping is involved.
- Check clipping, horizontal overflow, long labels, tall content, readable line length,
  image cropping, icon alignment, and fixed/sticky elements obscuring content.
- Inspect menus, dialogs, tooltips, and validation messages while open. Verify their
  stacking and position after scrolling and resizing, not only their closed state.
- Compare hierarchy, spacing, type scale, color, borders, and interaction states with
  the design contract. Separate deliberate design choices from broken implementation.
- Use stable data and wait for fonts/images before screenshot comparison. Record
  environmental differences; do not mask meaningful regressions to make a diff pass.

## Accessibility and input

- Traverse the affected journey with keyboard alone. Check logical focus order,
  visible focus, activation with expected keys, and a way to leave each interaction.
- For a modal dialog, check its accessible name, initial focus, focus containment,
  documented dismissal behavior, and focus return to the trigger on close.
- Inspect accessible names, roles, form labels, associated errors, headings, and
  meaningful image text. Verify status feedback can be discovered beyond color.
- Check text zoom/reflow and reduced-motion behavior when relevant. Inspect contrast
  against the applicable target with an available measurement tool, not by eyesight.
- Use existing automated accessibility checks if available, but report their scope.
  Screen-reader or touch behavior is unverified unless actually exercised; desktop
  viewport emulation alone does not prove behavior on a physical mobile device.

## Useful evidence

A finding records setup, exact action, expected and observed behavior, impact, and a
reproduction route. Attach a screenshot for visual defects, an interaction trace or
test result for behavior, and relevant sanitized console/network output for failures.
Avoid collecting unrelated personal content. A clean console is useful supporting
evidence, not proof that the user journey works.
