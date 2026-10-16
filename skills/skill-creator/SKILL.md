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
Inventory actual tools, model access, authentication, filesystem boundaries, and whether
the consumer is native Gemini CLI, Antigravity CLI, or this pack's mini chat. A native
agent may read resources on demand; a headless text request may receive only the
entry-point body. Required behavior must remain understandable without hidden tools.

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

## Write an executable decision guide

Start with when to use the skill, its expected output, and a concrete first action.
Teach decisions the agent would otherwise get wrong: which evidence to inspect,
which branch to choose, what changes are authorized, and what proves completion.
Use conditional branches for different task shapes rather than mandatory steps
unrelated to the request. Include failure recovery and a bounded stop condition.
Avoid fixed counts of questions, reviewers, screenshots, or retries without a reason.

For a design skill, make the agent inspect the product and visual evidence before
choosing a direction. Require meaningful decisions about hierarchy, layout, type,
color, responsive behavior, accessibility, and component states. Distinguish a design
specification, implementation, and browser verification so it cannot report one as
another. Reuse existing tokens and components before inventing a new system.

Reference a resource where the agent needs it, explain when to read it, and keep
essential boundaries in `SKILL.md`. Use relative Markdown links within the skill
folder. Scripts need a defined interface, safe defaults, prerequisite checks, clear
failure exits, and tests proportionate to their side effects. A script is not an
available tool until its runtime and execution permission are established.

## Adaptation checks

Replace source-specific tools with actual exposed Gemini tools or an honest fallback.
Do not copy Codex hidden goal APIs, OMX tmux commands, hook state, or connector assumptions.
Treat delegation as conditional on real installed support; name solo self-review accurately.
Keep scope, existing user authorization, and side-effect boundaries intact.
Define stop conditions for retries and potentially destructive operations.
Retain useful reasoning and provenance, not the source runtime's branded ceremony.
Do not imply that sequential role passes are independent review, that a prose prompt
creates a hook, or that skill activation grants network or credential access.

## Validation

Read [the authoring validation guide](references/validation.md) for discovery,
resource, and representative-task checks. Parse metadata, check matching folder/name,
and inspect references. Test useful activation and a request that should not activate
the skill. Exercise helper scripts when present with valid and failing input.

In this pack, `src/catalog.js` discovers `skills/<name>/SKILL.md` from the filesystem.
Maintain the existing `skills/catalog.json` provenance metadata when adding or adapting
pack skills; it is a pack artifact, not a native Gemini discovery requirement.
Plugin manifests explicitly list enabled skill names. Update those references only
when adding a skill to the requested plugin is in scope.
Run `npm run check` and relevant existing tests after changes. Record provenance for
adaptations without copying user-specific paths or private content.

The installer in `src/global-skills.js` copies enabled skills and their resources to
three global roots: `~/.gemini/skills/<name>/` for Gemini CLI,
`~/.gemini/antigravity-cli/skills/<name>/` for Antigravity CLI, and
`~/.gemini/config/skills/<name>/` for Antigravity IDE and App. Verify discovery in
the actual host separately. Managed files matching their recorded hashes and
unmodified legacy files matching bundled migration hashes can be upgraded safely;
unknown or user-edited conflicts are refused. Use `skill-manager` to reconcile
conflicts instead of forcing overwrite.
Report created files, checks, integration state, and capability gaps honestly.
