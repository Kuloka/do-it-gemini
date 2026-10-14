---
name: ai-slop-cleaner
description: Remove unnecessary code and duplication while preserving verified behavior.
---

# AI Slop Cleaner

Use for an explicitly requested cleanup, refactor, or removal of generated clutter.
Keep the pass within named files or the requested feature boundary.

## Behavior lock

Inspect the diff, code, callers, tests, and project conventions before editing.
Write a concise cleanup plan under `data/workflows/<slug>/cleanup-plan.md`.
Identify behavior to preserve and smells to remove in an ordered list.
Run relevant existing regression tests before changing the implementation.
Where meaningful behavior lacks coverage, add a regression test first.
Do not add a test that merely repeats the implementation's structure.

## Resolve suspicious fallbacks

Trace each fallback to its actual caller and failure contract.
Classify it as necessary compatibility/fail-safe behavior or masking a defect.
Keep grounded compatibility behavior unless the requested change replaces its contract.
Remove a masking fallback only when the primary path and error behavior are verified.
Do not guess that rare code is dead based on appearance alone.

## Bounded passes

1. Delete unreachable or obsolete code proven unused.
2. Remove duplication using an existing utility or direct simpler expression.
3. Clarify names and error handling without widening public contracts.
4. Add only the missing behavior tests required by the changes.

Run targeted verification after each meaningful pass.
Prefer deletion to new abstractions or speculative compatibility paths.
Add dependencies only when the user has requested them.
Avoid unrelated formatting churn that hides the actual simplification.

## UI changes

Use an existing `DESIGN.md`, tokens, and components as evidence.
Do not replace intentional styling with a generic aesthetic preference.
State the design rationale for an actual visual simplification.

## Exit

Run project-required lint, type checks, tests, build, and available static checks.
Review the final diff; use a separate reviewer if a real tool is available.
Label solo review as self-review, not independent approval.
Report changed files, deletions/simplifications, preserved behavior evidence, and gaps.
Stop when the selected smells are resolved or explicitly deferred with reasons.
