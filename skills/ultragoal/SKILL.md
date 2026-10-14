---
name: ultragoal
description: Execute a durable multi-step plan with explicit criteria, checkpoints, and resume evidence.
---

# Ultragoal

Use when a task needs durable progress across several implementation steps.
No Codex goal-mode API, automatic continuation hook, or OMX command is assumed.

## Create the record

Read the task brief, specification, plan, and applicable repository instructions.
Inspect `data/workflows/<slug>/` before creating or changing existing records.
Write `brief.md`, `goals.json`, and append progress to `ledger.jsonl`.
Each goal contains id, objective, acceptance criteria, dependencies, status,
evidence, and next action. Use stable identifiers such as `g1`.
Statuses are pending, in_progress, blocked, complete, and cancelled.
These files are workflow records, not a process scheduler or permission grant.

## Execute

1. Select a pending goal whose dependencies have current completion evidence.
2. Inspect affected code, callers, tests, and configuration.
3. Record the intended minimal change and mark the goal in_progress.
4. Implement with Gemini's available file editing and shell tools.
5. Run the smallest meaningful verification for changed behavior.
6. Inspect exit codes and output, then review the actual diff.
7. Save evidence before marking the goal complete.
8. Continue until all requested goals are complete or a precise blocker remains.

Checkpoint after each meaningful result or interruption.
Include the timestamp, goal id, event, evidence, and next action in each ledger entry.
Avoid concurrent writers to the same record; a coordinator integrates worker results.

## Resume and steering

Re-read records and inspect current files; do not trust an old complete label alone.
Use current evidence to distinguish completed work from partial changes.
Preserve unrelated user edits and never reset the worktree to manufacture cleanliness.
Update pending goals when new user instructions change their scope.
Record added or superseded goals and the reason rather than silently erasing history.

## Final gate

Verify each acceptance criterion against the resulting artifacts.
Run project-required tests, diagnostics, and build checks where applicable.
Review the changed scope; label self-review honestly when no separate reviewer exists.
Remove temporary probes that the task does not require.
Report blocked checks explicitly; successful ordinary tests cannot replace a missing evaluator.
Stop at verified completion, cancellation, or an exact bounded blocker.
