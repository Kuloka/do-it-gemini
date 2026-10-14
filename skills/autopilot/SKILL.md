---
name: autopilot
description: Deliver an authorized task through requirements, reviewed planning, implementation, and verification.
---

# Autopilot

Use for an explicit end-to-end autonomous delivery request.
This workflow uses ordinary Gemini tools and durable files, not hidden goal APIs.

## Intake and state

Inspect repository instructions and the current worktree before editing.
Choose a unique task slug; inspect an existing task directory before resuming it.
Store workflow artifacts under `data/workflows/<slug>/`.
Record objective, scope, phase, evidence paths, and next action in `status.json`.
Keep credentials, raw tokens, and unnecessary private conversation out of state.
The files record progress; they do not provide authorization or sandbox privileges.

## Stage 1: Requirements

Load `deep-interview` and apply its intake and readiness checks.
For a clear request, record a complete specification without unnecessary questions.
For material ambiguity, ask focused questions before dependent implementation.
Require explicit non-goals and testable acceptance criteria in `spec.md`.
Record why requirements are ready before moving to planning.

## Stage 2: Reviewed planning

Load `ralplan`; produce the plan, architecture pass, and critical validation pass.
Read the resulting findings before proceeding.
Use real independent reviewers only if the installed Gemini tools support them.
Label the solo fallback self-review and preserve its limitations.
Return to requirements when a planning contradiction changes user intent.

## Stage 3: Execution

Load `ultragoal` and implement the reviewed plan in bounded increments.
Preserve unrelated changes and use existing project conventions.
Run targeted tests before broader required checks.
If a failure reveals a specification or design flaw, update the relevant earlier stage.
Implementation-only fixes remain in the execution stage.

## Completion and interruption

Continue safe, reversible work within the existing authorization.
Stop for cancellation, a genuine human-only dependency, or verified completion.
On interruption, record the actual state and a concrete resume action.
Do not promise work will continue after the Gemini process exits.
Finish with changed files, acceptance evidence, remaining limitations, and task status.
Mark complete only after the requested result exists and required verification passes.
