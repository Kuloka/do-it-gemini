---
name: analyze
description: Trace repository behavior and rank evidence-backed explanations without editing code.
---

# Analyze

Use for a causal, architectural, behavioral, or impact question spanning code boundaries.
For a simple symbol lookup, inspect directly; do not create an investigation workflow.

## Intake

1. Restate the question and the requested scope.
2. Read applicable `GEMINI.md`, the project manifest, and the relevant contract.
3. Locate the entry point, callers, configuration, and directly related tests.
4. Inspect current files before treating an old log or document as current evidence.

Use Gemini CLI's available `read_file`, search tools, and `run_shell_command`.
Prefer `rg` for shell searches when installed; use platform-native search otherwise.
Read-only commands must not install dependencies, start migrations, or alter state.

## Investigation

Trace an input through transformations, side effects, error paths, and output.
Test competing explanations against the same observations.
Use a bounded read-only diagnostic when source inspection cannot distinguish them.
Record a command's exit status as well as its text output.
Separate a harness failure from a failure in the application.
Stop tracing once additional files cannot materially change the conclusion.

## Evidence labels

- Evidence: directly shown by source, configuration, tests, or observed output.
- Inference: a reasoned conclusion from named evidence.
- Unknown: not established by the available repository or diagnostic.

For each material claim, include a file path and line or a precise command result.
Confidence is qualitative; do not invent measured probabilities.

## Result

Lead with the answer, then rank plausible explanations with High/Medium/Low confidence.
Include the strongest evidence and why alternatives are weaker.
Name the smallest unresolved probe if the answer remains uncertain.
Do not silently implement a proposed fix during this skill.
Do not create a persistent report unless the task asks for one.
If requested, write a sanitized report under `data/workflows/<slug>/analysis.md`.
