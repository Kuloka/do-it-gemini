# Visual and interaction evidence

Use the actual browser capabilities available in this session. Inspect screenshots
yourself rather than reporting that a screenshot file exists. Keep a compact record
of viewport, state, action and observed result. Do not create a large QA system for
a small style change.

## Useful verification matrix

| Scope | What to exercise | Evidence |
|---|---|---|
| Wide layout | Above fold, full content, long text, overlays/sticky regions | Rendered viewport and full-page inspection |
| Narrow layout | A representative phone width and 320 CSS px where relevant | No unintended document-level overflow or hidden actions |
| Primary journey | Entry → decision → action → outcome/recovery | Actual interactions and visible state changes |
| Keyboard | Reach controls, activate, open/close overlays, return focus | Keyboard actions and focused-element observation |
| Forms | Empty/invalid/valid values, errors, submission and correction | Visible/associated errors, retained data, truthful outcome |
| Content states | Loading, empty/filter-no-match, error, success | Deliberately reached states, not promises in code comments |
| Motion | Reduced-motion preference and static completeness | Observed behavior or explicit untested gap |
| Runtime | Relevant console errors and failed asset/data requests | Browser/runtime records after the journey |

Use the target devices and existing product breakpoints. A broad default check is
one wide viewport and one narrow viewport; 320 CSS px tests WCAG reflow for normal
vertically flowing content. Tables/maps can legitimately need local two-dimensional
scrolling; do not exempt the whole page because it contains a table.

## Accessibility details that affect the design

- Normal text contrast is at least 4.5:1 for WCAG AA; qualifying large text is 3:1.
  Apply the criterion's actual exceptions rather than claiming every pixel needs
  a text ratio. Important control boundaries and graphical objects have their own
  non-text contrast requirements.
- Native buttons/links/inputs should express their actual behavior. A clickable
  `div` is not an adequate default. Give forms persistent labels and useful errors.
- Keep focus visible and not entirely hidden by author-created sticky UI. Test the
  focused control, not just the presence of a CSS focus rule.
- WCAG 2.2 AA target size is 24×24 CSS px or a valid spacing/other exception. Larger
  comfortable touch controls can be a product choice; do not call 44 px the AA
  target-size minimum.
- A modal needs a meaningful name, sensible initial focus, Tab/Shift+Tab handling,
  Escape dismissal when appropriate and focus return. Prefer a suitable native
  dialog or an established accessible component over inventing focus handling.
- Announce important asynchronous outcomes without unexpectedly moving focus.
  Avoid announcing every cosmetic change or replacing an entire page with a live region.

## Reference matching

Record the reference and viewport before comparing. Match information hierarchy,
geometry, type scale, image placement and responsive behavior before fine colors.
Screenshot differences are meaningful only when content, viewport and relevant
state agree. Antialiasing differences alone should not drive a redesign.
Do not claim pixel matching without a comparison against the actual reference.

## Review and iteration

Write issues as observation → user/design impact → concrete fix → recheck. Rank
blocked tasks, inaccessible interactions and broken reflow before decoration.
For visual polish, fix one coherent issue group and inspect again so changes can
be attributed. Stop after meeting the brief, not after a fixed number of passes.

If you cannot render or interact, inspect source and document the limits precisely.
"CSS declares a grid" is source evidence; "the mobile layout is correct" requires
rendered evidence. Never report full WCAG conformance based on a screenshot or
an automated audit alone.

## Primary references

- [WCAG 2.2 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [Modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)
