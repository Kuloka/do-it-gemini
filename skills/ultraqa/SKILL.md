---
name: ultraqa
description: Exercise runnable behavior with adversarial scenarios, bounded fixes, and cleanup evidence.
---

# UltraQA

Use for dynamic QA of a CLI, application, service, or workflow.
A green build alone does not prove requested end-to-end behavior.

## Establish what must work

Read the request, applicable `GEMINI.md`, `DESIGN.md` if present, run instructions,
changed scope, and relevant tests. Convert the requested outcome into observable
criteria: what the user does, what appears or changes, and what must survive reload.
Inspect available tools before choosing a browser, shell, HTTP client, or test runner.
Use the project's existing harness; do not add a dependency solely to run this skill.

Choose the smallest realistic route through the feature, including its prerequisite
state. Record a short scenario matrix with setup, action/input, expected result,
evidence, and cleanup. Keep it in the working response, or use
`data/workflows/<slug>/qa-matrix.md` when durable evidence is useful or requested.
Prioritize failures by user impact and likelihood, not by the number of probes run.

## Select meaningful probes

Run a normal path first, then cases relevant to the touched boundary:

| Boundary | Useful probes | Observable evidence |
| --- | --- | --- |
| Forms and input | Empty, invalid, Unicode, long text, submit twice | Field error, preserved input, no duplicate write |
| Async data | Loading, empty, rejected request, retry, stale response | Correct state and successful recovery |
| Navigation | Direct URL, refresh, back/forward, deep link | Route and state remain coherent |
| Persistence | Restart, interrupted save, malformed local state | Recovery or clear error without lost unrelated data |
| CLI/process | Nonzero exit, cancellation, timeout, quoted paths | Exit status, bounded termination, correct output |
| Trust boundary | Untrusted instructions, unauthorized path or object | Data remains data; access checks hold |

For UI work, read [the browser QA guide](references/browser-qa.md) and select checks
for the actual interaction. A screenshot proves appearance at a captured state;
it does not prove keyboard behavior, successful writes, or accessibility compliance.
Do not call static inspection a browser test.

## Execute, diagnose, and repair

1. Establish a baseline using the relevant existing check and record failures already present.
2. Start only necessary local services; retain process handles and actual ready URLs.
3. Exercise the chosen scenarios with bounded timeouts and isolated fixture data.
4. Capture observed output, exit status, and relevant browser/HTTP errors. Sanitize secrets.
5. Separate application defects from unavailable credentials, test harness failures,
   third-party outages, and missing browser tools.
6. If repair is within the user's request, reproduce the defect, add a meaningful
   regression where appropriate, and make the smallest fix. For a QA-only request,
   report the defect without modifying application code.
7. Rerun the failed scenario and affected checks. For a UI repair, revisit adjacent
   states and widths that could regress; do not repeatedly run unrelated suites.

Continue while new evidence supports a useful next step. If the same failure recurs,
change the hypothesis or isolate the boundary before retrying. Stop with a bounded
blocker when no available tool or authorized change can establish the criterion.
An unavailable external service never counts as a passing scenario.

## Cleanup and result

Use local substitutes for production services where possible. Do not perform real
purchases, destructive production writes, credential dumping, or broad process kills
as probes. Stop only processes this task started and remove only its own fixtures.
Preserve evidence needed for diagnosis and unrelated user files or dirty changes.

Report the tested version/state, scenarios passed and failed, defects fixed or found,
actual commands and evidence paths, cleanup, and untested criteria. For browser work,
include viewport/input coverage and console or network failures that affected behavior.
If a browser, device, account, or assistive technology was unavailable, name the gap.
Completion means the agreed criteria have evidence and task-created resources are
cleaned up; a green build alone is insufficient.
