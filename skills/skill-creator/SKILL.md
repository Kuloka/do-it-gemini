---
name: skill-creator
description: Create or adapt a Gemini skill with precise discovery metadata, practical steps, and real tool boundaries.
---

# Skill Creator

Use for creating or updating an agent skill, including adapting another agent's workflow.
Assume Gemini already knows general coding; include guidance that changes useful decisions.

## Understand the target

Identify the task shape, trigger, deliverable, constraints, and completion evidence.
Read existing neighboring skills and the target Gemini installation's documented capabilities.
Respect a user-specified location; otherwise follow the current pack's `skills/<name>/` layout.
Do not claim that a pack-local folder is automatically a native Gemini installation.
For native installation, check the installed CLI's help and current official documentation.

## Structure

Create `SKILL.md` with YAML `name` and `description` followed by Markdown instructions.
Use lowercase letters, digits, and hyphens for a name under 64 characters.
Make the description explain when the skill helps and what it does.
Do not include unrelated triggers to increase discovery.
Keep the entry point short enough to read when activated.
Move large mode-specific guidance to referenced files only when it has a real use.

Optional resources should have a concrete purpose:

- `scripts/` for tested deterministic helpers.
- `references/` for specific contracts or documentation.
- `assets/` for actual output resources.

Do not create placeholder folders or duplicate instruction manuals.

## Adaptation checks

Replace source-specific tools with actual exposed Gemini tools or an honest fallback.
Do not copy Codex hidden goal APIs, OMX tmux commands, hook state, or connector assumptions.
Treat delegation as conditional on real installed support; name solo self-review accurately.
Keep scope, existing user authorization, and side-effect boundaries intact.
Define stop conditions for retries and potentially destructive operations.

## Validation

Parse metadata, check matching folder/name, and inspect referenced resources.
Run helper scripts if created and record meaningful example-based validation.
Test that a sample request selects useful steps and has a concrete completion criterion.
Update `skills/catalog.json` when the pack uses that catalog.
Record provenance for adaptations without copying user-specific absolute paths.
Report created files and capability gaps; do not imply a native install unless verified.
