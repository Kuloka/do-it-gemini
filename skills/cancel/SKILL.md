---
name: cancel
description: Stop the current task safely while preserving resumable work and unrelated sessions.
---

# Cancel

Use when the user says stop, cancel, or abort the active task.
This adaptation does not use OMX state APIs or hidden Gemini lifecycle tools.

## Immediate behavior

Stop scheduling new implementation, retry, or research work for the cancelled task.
Respect cancellation even if the task could be completed with one more command.
A user's interruption is not permission to discard their changes.
Distinguish “pause and resume later” from “cancel” when the wording establishes it.

## Select the scope

Use the current task's actual slug, artifact directory, and tracked process handles.
Read task records before editing them; never enumerate unrelated sessions for cleanup.
If no task record exists, report that the conversation task is stopped.
Do not create fake background state merely to mark it cancelled.

## Bounded cleanup

1. Identify temporary probes and processes started by this task.
2. Stop a known process through the available tool or exact tracked handle.
3. Do not kill all `node`, `gemini`, terminal, or browser processes by name.
4. Remove only disposable artifacts known to belong to these probes.
5. Preserve source edits, user data, validation logs, and useful resume evidence.
6. Record cancellation and the last verified result in the task's record when present.

If a running tool cannot be interrupted from the current Gemini surface, say so.
Do not pretend that editing a JSON flag terminates an operating-system process.
Avoid cleanup that would require an irreversible rollback beyond the user's request.

## Resume evidence

Record remaining partial work and a concrete next action without continuing it.
For pause, record paused rather than complete.
For cancellation, mark pending work cancelled only within the selected task.
Never mark the task successful because its loop has stopped.

## Result

Report task scope, whether a process remains active, preserved files, and cleanup outcome.
If there was no active task, return a clean no-op result.
Do not remove session history, global configuration, plugins, or skills as normal cancellation.
Finish after the selected task is stopped or the precise interruption limitation is disclosed.
