# Building an interface that survives use

## Work with the repository

Find the actual entry point, shared layout, token/theme owner and test commands.
Do not generate a second application when an existing route/component is the
requested target. Keep dependencies within the user's choice and existing stack.
For a buildless prototype, local HTML/CSS/JS is sufficient; for a repository app,
use its routing, state, form and asset conventions.

## Compose with constraints

Use content-led containers and useful minimum/maximum sizes. `minmax(0, 1fr)` and
`min-width: 0` are often important inside grids/flex layouts with long content.
Use wrapping and local scrolling deliberately. Do not hide document overflow to
conceal a layout bug. Keep text and important actions clear at small widths and zoom.

Define typography, spacing and color roles before scattering arbitrary values.
An intentional exception is acceptable; unexplained near-duplicates create visual
noise. Use comfortable line lengths and real long copy rather than placeholder
headings that avoid difficult wrapping. Avoid unnecessary fixed heights on text.

## Interaction contracts

| Pattern | Working behavior |
|---|---|
| Filter/search | Visible matching results, clear active state, no-match recovery |
| Navigation | Valid destinations or honest in-page behavior; preserve back/URL conventions |
| Form | Persistent labels, validation, retained input, associated errors, truthful completion |
| Async action | Pending state, duplicate-action handling, error/retry and completion feedback |
| Modal | Accessible name, focus entry/containment/return, close behavior, small-screen fit |
| Disclosure | Real button, state semantics, keyboard activation, content kept meaningful |
| Destructive action | Consequence visible, requested authorization respected, recovery where available |

Do not simulate a server/payment/booking completion without identifying local-demo
behavior. Do not disable native browser constraints to make a visual demo appear to work.

## Accessible by construction

Prefer native controls and existing accessible components. Give icon-only controls
names, controls visible focus and form fields persistent labels. Do not make color
the sole carrier of meaning. Use live announcements for important asynchronous
outcomes without turning the whole interface into a noisy live region.

Treat motion, sticky regions and overlays as behavior, not decoration. Respect
reduced motion; keep focus visible beneath sticky UI; reserve content space for
loading assets. Keep meaningful content available if an animation or image fails.

## Finish against the actual result

Inspect a wide and a narrow rendered view and run the important task. Try realistic
long text, no results, invalid input and successful correction. Check console and
asset failures after interactions. Test keyboard access directly where supported.
Screenshots alone cannot prove focus handling, validation or full accessibility.

Record a concise list of remaining gaps rather than treating an unavailable tool
as a passing test. For a reference-matching task, compare like-for-like content,
viewport and state before drawing conclusions from visual differences.
