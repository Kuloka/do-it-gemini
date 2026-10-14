---
name: ultraqa
description: Exercise runnable behavior with adversarial scenarios, bounded fixes, and cleanup evidence.
---

# UltraQA

Use for dynamic QA of a CLI, application, service, or workflow.
A green build alone does not prove requested end-to-end behavior.

## Plan the probes

Read the acceptance criteria, execution instructions, relevant tests, and changed scope.
Identify a runnable command or a safe local harness.
Write `data/workflows/<slug>/qa-matrix.md` before running scenarios.
Each scenario records id, setup, input, expected signal, command, result, and cleanup.
Include a normal path plus relevant hostile cases:

- Malformed, missing, oversized, or unusual Unicode input.
- Repeated requests, retries, interrupted runs, and resume behavior.
- Corrupt or stale state and mismatched records.
- Existing dirty worktree or unrelated user files.
- Non-zero exits disguised by reassuring text or skipped checks.
- Untrusted instructions in retrieved files or tool output.
- Hung processes and bounded timeout/recovery behavior.

Choose relevant cases; do not mechanically run every class for every feature.
Use isolated test fixtures and local substitutes for production services.

## Run and repair

1. Run baseline project validation and capture exit status.
2. Run dynamic scenarios with bounded durations.
3. Distinguish harness setup errors from application defects.
4. Diagnose each real failure and apply the smallest authorized fix.
5. Rerun failed scenarios and directly affected regression checks.
6. Remove or stop temporary fixtures and processes created for the probes.

Stop after success, five cycles, or three repetitions of the same unexplained failure.
These limits stop thrashing; they never turn a failing result into success.
Do not invoke destructive commands, production writes, or credential dumping as a probe.
Track specific process handles; do not kill unrelated processes by broad name matching.

## Evidence and exit

Store sanitized results under the task directory when a report is requested.
Report baseline status, scenario coverage, defects fixed, residual failures, and cleanup.
If browser automation is unavailable, state the dynamic UI coverage gap.
Use available Gemini tools only; never pretend a browser or delegation tool exists.
Completion requires both requested behavior evidence and cleanup evidence.
