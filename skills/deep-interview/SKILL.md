---
name: deep-interview
description: Turn a materially ambiguous idea into a bounded, testable specification through focused questions.
---

# Deep Interview

Use for unclear outcomes, non-goals, or decision boundaries.
Respect a user's explicit instruction to execute without an interview.

## Preflight

Read available `GEMINI.md`, README, nearby documentation, and relevant code.
Identify known facts, contradictions, and human-only decisions.
Do not ask the user to locate files or explain behavior discoverable in the repository.
Summarize large source documents while preserving references to their full text.
Do not copy private transcripts into public project documentation.

## Interview loop

1. Start with the desired user outcome and why it matters.
2. Ask one focused question about the largest unresolved decision.
3. Wait for the answer in chat; use a structured question tool only if available.
4. Record the answer separately from facts established by code or research.
5. Challenge an important assumption with a concrete scenario.
6. Reassess what remains unresolved before selecting the next question.

Cover goals, current pain, users, scope, non-goals, acceptance criteria,
constraints, and choices the agent may resolve during implementation.
Prefer examples such as “What should happen when input is missing?”
Avoid repeatedly rephrasing a question that the user has already answered.

## Depth

- Quick: at most five questions for a narrow ambiguous task.
- Standard: at most twelve questions for a feature or workflow.
- Deep: at most twenty questions when explicitly requested.

These are caps, not targets or proof of completeness.
Describe remaining ambiguity in words rather than claiming mathematical certainty.
Stop ordinary questioning once the specification is actionable.
If a cap is reached, report unresolved decisions instead of inventing answers.

## Artifact and handoff

Write `data/workflows/<slug>/spec.md` for an implementation workflow.
Include outcome, non-goals, verified facts, decisions, constraints,
acceptance criteria, assumptions, and unresolved questions.
Keep sensitive details out of the artifact unless essential and authorized.
Hand the specification to `plan` or `ralplan`; do not start unrelated work.
If an existing complete specification satisfies intake, preserve it and document readiness.
