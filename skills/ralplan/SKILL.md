---
name: ralplan
description: Review a concrete plan through planning, architecture, and critical validation passes.
---

# Ralplan

This adaptation is a structured deliberation workflow, not an OMX runtime command.
Use for a consequential plan or as the planning stage of `autopilot`.

## Inputs

Read the specification, repository constraints, proposed scope, and validation tools.
Use `data/workflows/<slug>/` for durable planning artifacts.
Do not fabricate a specification if unresolved product decisions affect the plan.

## Planning pass

Create `plan.md` with implementation sequence, acceptance criteria, and checks.
Record three to five principles and the three strongest decision drivers.
Compare at least two realistic approaches, including costs and risks.
If only one approach is viable, show why the alternatives fail the constraints.
For migrations, security changes, or destructive operations, add failure scenarios
and recovery steps proportional to the actual risk.

## Architecture pass

Review interfaces, ownership, data flow, compatibility, and existing conventions.
State the strongest reasonable objection to the chosen approach.
Identify a real tradeoff and propose a synthesis where possible.
Save `architecture-review.md` with concrete evidence and proposed corrections.
Complete this pass before starting the critical validation pass.

## Critical validation pass

Check principle-option consistency and whether alternatives were compared fairly.
Check that risks have mitigations and criteria have runnable verification.
Return READY, REVISE, or BLOCKED with specific findings in `plan-review.md`.
Revise the plan and repeat affected reviews, at most five rounds.
After the cap, report the best plan and exact remaining issues.

## Capability boundary

Use separate reviewers only when the installed Gemini surface exposes real delegation
and it is appropriate for the task; check tools and documented version support first.
Otherwise perform sequential passes yourself and label them self-review.
Do not call sequential passes independent consensus or independent approval.
Local review files are evidence, not an execution permission mechanism.

## Handoff

Planning-only requests stop with the reviewed plan.
For authorized delivery, pass the plan and findings to `ultragoal`.
Do not claim readiness while a required criterion has no verification path.
