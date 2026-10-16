---
name: code-review
description: Review a requested diff for concrete correctness, security, compatibility, and test gaps.
---

# Code Review

Use when the user requests review or an authorized workflow needs a review stage.
The default deliverable is findings, not silent code edits.

## Establish the review target

Read requirements and applicable `GEMINI.md` instructions.
Inspect `git status --short`, the selected diff, and relevant test evidence.
For committed changes, establish the correct base before comparing revisions.
Do not assume every uncommitted file belongs to the requested change.
If Git is unavailable, review named files and state the missing comparison evidence.

## Inspect behavior

Read whole affected functions and callers, not only changed lines.
Trace inputs, validation, error handling, side effects, and output contracts.
Check authorization boundaries, untrusted paths, injection risks, and secret handling
when they are actually touched by the change.
Check compatibility assumptions against manifests and actual usage.
Check that tests exercise the changed behavior rather than mirror implementation.
Prefer a reproducible failure or precise code path over speculative warnings.

For each important path, follow the concrete trigger through callers and state updates
to the visible result or persistent side effect. Read the previous implementation
where needed to establish whether a defect was introduced. Check partial failure,
retry, cleanup, and cancellation only where the code supports those paths. Distinguish
new regressions from existing defects; describe existing issues separately when useful.

## Frontend and design pass

For UI changes, read the design contract or supplied reference and inspect the
affected component, styling, state owner, and caller together. Prioritize:

- Semantics and input: names and labels, appropriate buttons/links, form validation,
  keyboard activation, visible focus, modal focus behavior, and status feedback.
- Responsive behavior: fixed dimensions, overflow, wrapping, long/localized content,
  image sizes, sticky regions, and overlays near actual layout breakpoints.
- Data states: loading, empty, error, success, stale responses, double submission,
  and state reset on navigation or changing the selected object.
- Design fidelity: hierarchy, tokens, typography, spacing, contrast, and complete
  interaction states against the agreed contract, not the reviewer's personal taste.
- Runtime cost: unnecessary request waterfalls, layout shifts, missing image dimensions,
  and expensive work in frequently repeated rendering paths where evidence supports it.

Use an existing browser or component harness when available. Reproduce the affected
journey at relevant widths and inspect browser errors when running the UI. If no
browser is available, state that visual and interaction behavior was inspected only
in source. An automated accessibility pass does not establish complete accessibility.
Use `ultraqa` for a broader dynamic investigation when that scope is authorized.

## Architecture pass

Check whether the change follows established ownership and dependency patterns.
Identify unnecessary abstractions, duplicated state, or unexplained dependencies.
Distinguish a concrete defect from a style preference.
An architecture disagreement should describe the consequence and tradeoff.

## Review independence

If real Gemini delegation tools exist, scoped independent reviewers may be used.
Verify their availability rather than inventing a subagent command.
Otherwise perform sequential correctness and architecture passes yourself.
Label these self-review; they do not constitute independent approval.

## Findings

Order actionable findings by severity and include path, line, trigger, impact, and fix.
Use Critical, High, Medium, and Low only where the consequence justifies the label.
Include checks performed, tests inspected or run, and unresolved uncertainty.
Give file/line references to the smallest useful location. A finding should explain
the triggering condition, concrete consequence, evidence, and a bounded remedy.
Do not present hypothetical danger without a reachable path or known contract.
Separate blocking defects from optional improvements, and avoid repeating one root
cause as several findings. Say when a proposed fix has not been tested.
If no concrete findings remain, say so while stating the review coverage.
Do not claim exhaustive safety from a small review.
Write `data/workflows/<slug>/code-review.md` only when durable evidence is requested.
If fixes are authorized, apply them and rerun affected checks before closing findings.
