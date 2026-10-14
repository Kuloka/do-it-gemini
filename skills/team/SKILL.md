---
name: team
description: Coordinate bounded implementation lanes when real Gemini delegation is available, with an honest solo fallback.
---

# Team

Use when independent lanes materially improve delivery and coordination is requested.
This skill is a coordination method, not an implementation of a process supervisor.

## Capability preflight

Check the actual exposed Gemini tools and installed version's documented delegation support.
Do not infer subagents from the ability to run shell commands.
Do not invent tmux workers, mailbox APIs, agent role flags, or a `gemini team` command.
Do not launch unattended nested Gemini processes merely to simulate independent agents.
If delegation is unavailable, execute lanes sequentially and explicitly say “solo execution”.
Solo role passes are not independent review or approval.

## Decompose

Read the specification, plan, repository conventions, and current worktree.
Choose independent slices with concrete deliverables and verification commands.
Assign exclusive file/module ownership where parallel edits could conflict.
Each assignment includes inputs, scope, non-goals, success criteria, and report format.
Tell performers that other edits may be present and must not be reverted.
Keep shared interfaces and final integration owned by the coordinator.

## Track

Use `data/workflows/<slug>/team.md` for lane assignments and evidence.
Record actual statuses: pending, active, complete, blocked, cancelled.
Keep one writer for shared progress records; performers return their findings.
Use only the actual native tool's message and completion surfaces when present.
Task files do not prove that a worker process exists or has finished.

## Integrate

1. Inspect each lane's returned files and verification evidence.
2. Resolve interface conflicts without discarding unrelated work.
3. Re-run directly affected integration checks on the combined result.
4. Confirm all lanes have stopped writing before final validation.
5. Audit acceptance criteria against the integrated output.

When a lane is blocked, continue independent work that does not depend on it.
Escalate missing authority, shared-file conflicts, or architectural scope changes precisely.
Avoid recursively creating more coordinators for a bounded task.

## Result

Report actual execution mode, lane outcomes, integrated checks, and remaining blockers.
Stop at verified integration or explicit cancellation.
Never claim parallel execution or independent approval when only sequential passes ran.
