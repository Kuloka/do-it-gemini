# Validate a skill before shipping it

Use the existing repository validator and test harness when available. Do not invent
an evaluation service or claim a model test ran when only the text was inspected.

## Static contract

- Frontmatter parses, `name` matches the directory, and `description` identifies a
  useful task and trigger without advertising unrelated capabilities.
- Every local reference exists within the intended skill resource tree; destinations
  and script arguments do not embed the author's home directory or credentials.
- Scripts, templates, and examples agree with instructions and declared prerequisites.
- No copied source-specific commands assume hidden state, delegation, a browser, or
  privileged operations. Fallbacks report lost coverage rather than simulate success.
- Resources needed by a text-only consumer have a realistic reading path or the
  critical guidance remains in the entry point. A Markdown link is not automatic loading.

## Representative task evaluation

Choose examples based on failure risk: an ordinary request, a boundary case, and a
nearby request that should use a different skill are often useful. Add tool absence,
ambiguous input, or unsafe side effects when those matter to this skill.

For each example, record the prompt, available tools/context, expected decisions,
expected artifact, and completion signal. Check whether the skill:

1. Selects relevant evidence before acting.
2. Applies the right branch without expanding scope.
3. Produces an artifact a real user can use or inspect.
4. Verifies its specific claims and labels missing proof.
5. Stops or recovers correctly when prerequisites fail.

If an authorized Gemini interface is available, exercise representative prompts
against the candidate skill in an isolated workspace. Use synthetic data and record
the provider/model and observed behavior without leaking tokens. When comparing a
revision, keep the task and available context comparable. Identify concrete failures
and revise the instruction responsible; do not improve a score by weakening criteria.

If execution is unavailable, perform a structured walkthrough and label it static
validation. Do not report the walkthrough as a live model evaluation. Additional
review by a real separate agent can supply independence; renaming solo passes cannot.

## Packaging and native discovery

Check packaged contents include referenced resources, not just `SKILL.md`. This
pack's installer recursively copies regular files, safely upgrades unchanged managed
or trusted legacy files, and rejects symbolic links and unknown or modified conflicts.
Test installation in a temporary home using the
existing harness where available; never overwrite a user's skill to make a test pass.

Reading a packaged file proves packaging. Reading its installed copy proves copying.
Seeing it in the host's actual skill inventory proves discovery. Exercising a task
through the host provides behavior evidence. Report which of these were verified.
