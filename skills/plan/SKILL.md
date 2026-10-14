---
name: plan
description: Create or review a concise implementation plan grounded in repository evidence.
---

# Plan

Use when planning is the requested deliverable or implementation needs sequencing.
Skip a separate planning workflow for a clear, small fix.

## Establish scope

Read `GEMINI.md`, existing plans, manifests, relevant code, and test commands.
Discover repository facts with available Gemini file/search/shell tools.
Do not ask the user questions that inspection can answer.
Separate a product decision from an implementation detail you can resolve locally.

Choose one mode from the user's request:

- Direct: enough constraints exist to draft immediately.
- Interview: a missing decision materially changes scope or acceptance criteria.
- Review: evaluate an existing plan without implementing it.

For interview mode, ask one concise question at a time in chat.
Wait for an actual answer to required decisions; elapsed time is not an answer.
If remaining choices are reversible and minor, record a reasonable assumption.

## Draft

Save `data/workflows/<slug>/plan.md` using `write_file` or an available edit tool.
Include the following information:

1. Outcome and non-goals.
2. Observable acceptance criteria.
3. Ordered implementation steps with concrete file references.
4. Dependencies and compatibility constraints established by inspection.
5. Risks with a corresponding mitigation or deliberate tradeoff.
6. Exact validation commands and expected signals.

Right-size the number of steps; do not force a five-step template.
Prefer existing repository patterns and avoid speculative abstractions.
Distinguish code facts from proposed design choices.

## Review and handoff

Check that every acceptance criterion has a validation path.
Check referenced paths and commands actually exist.
For review mode, return READY, REVISE, or BLOCKED with specific reasons.
Self-review is useful but must not be described as independent approval.
Planning alone does not grant permission to deploy or publish.
Continue into implementation only when the broader request already includes it.
