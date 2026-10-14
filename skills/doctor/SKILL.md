---
name: doctor
description: Diagnose this Gemini pack, CLI availability, configuration, and skill/plugin discovery.
---

# Doctor

Use for installation, startup, configuration, or discovery problems.
Diagnose first; avoid treating every warning as a reason to reinstall globally.

## Gather evidence

Read package scripts, launcher source, configuration, and the reported error.
Use `run_shell_command` for bounded diagnostics supported by the current platform.
Capture exact executable paths, versions, exit statuses, and sanitized error messages.
On Windows, use `Get-Command` or `where.exe`; do not assume Bash is present.

Check these surfaces when relevant:

- Node.js version against the package's declared engine requirement.
- The pack's CLI executable and project working directory.
- `gemini --version` and `gemini --help` if the executable is available.
- Required dependency resolution without changing the lockfile.
- Pack configuration parsing and writable `data/` paths.
- Skill metadata, catalog entries, and referenced resources.
- Plugin JSON schema fields and references to known skill names.
- Session records for truncation, malformed JSON, or mismatched identifiers.

Do not infer authentication success from merely finding the Gemini executable.
Do not display credentials, environment secrets, or full private configuration values.

## Classify

Use OK, INFO, WARN, or ERROR with evidence and a specific consequence.
Missing optional native skill/subagent support is a capability limit, not necessarily a broken pack.
Keep launcher failures separate from provider, authentication, and network failures.
Corroborate a claimed repair by rerunning the failing check.

## Repair

Apply authorized reversible local repairs after identifying the exact target.
Preserve custom configuration; back up a file before a risky replacement.
Do not remove global Gemini directories or unrelated plugins as a routine fix.
Check installed help before proposing a version-specific command.
If a dependency install is necessary, use the repository's declared package manager.

## Report

Give a compact check/status/evidence table and any repairs performed.
Include the exact remaining blocker and the smallest next diagnostic.
Write `data/workflows/<slug>/doctor.md` only when requested as a persistent report.
