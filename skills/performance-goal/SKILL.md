---
name: performance-goal
description: Optimize a measured performance target through reproducible benchmarks and regression gates.
---

# Performance Goal

Use for an explicit performance improvement with a measurable objective.
Do not call ordinary passing tests evidence that a performance target was reached.

## Evaluator contract

Before editing, define the baseline, target, workload, metric, and acceptance rule.
Examples include p95 latency, startup duration, peak memory, or throughput.
Read the benchmark implementation and confirm it exercises the requested path.
Record environment, dependency versions, warmup, sample count, and noise controls.
Use realistic data without exposing production secrets.

Write `data/workflows/<slug>/performance-contract.md` with:

- Objective and constraints, including behavior that must remain unchanged.
- Exact evaluator command and expected output format.
- Baseline measurement and target comparison rule.
- Regression tests and resource limits.
- Maximum experiment count or time budget if the user specified one.

If no valid evaluator exists, build the smallest authorized benchmark or report the gap.
Do not begin speculative optimization before a reproducible baseline exists.

## Optimize

1. Inspect or profile the actual bottleneck.
2. State a hypothesis and the expected metric effect.
3. Apply one bounded, reversible change using existing patterns.
4. Run the evaluator under the same conditions as baseline.
5. Run behavior regression tests and relevant diagnostics.
6. Keep changes with supported improvement; remove failed experimental edits.
7. Record hypothesis, measurement, verdict, and next action in `performance-results.md`.

Use multiple samples where single runs are noisy.
Do not hide regressions by changing the workload, threshold, or sample selection.
Treat evaluator failures separately from failed optimization hypotheses.
Stop repeating an unchanged failing approach; investigate or state a blocker.

## Complete

Rerun the final evaluator and tests against the actual final files.
Report baseline, final measurement, relative improvement, and variability/limitations.
Mark success only if the declared performance and correctness gates pass.
No hidden goal API or background scheduler is assumed by this workflow.
Retain reproducible commands and sanitized evidence for future remeasurement.
