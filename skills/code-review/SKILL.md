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
If no concrete findings remain, say so while stating the review coverage.
Do not claim exhaustive safety from a small review.
Write `data/workflows/<slug>/code-review.md` only when durable evidence is requested.
If fixes are authorized, apply them and rerun affected checks before closing findings.
