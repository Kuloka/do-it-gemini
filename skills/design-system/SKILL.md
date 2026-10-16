---
name: design-system
description: Define or improve coherent design tokens and reusable UI components while preserving existing product conventions, accessibility, and responsive states.
---

# Design System

Use when repeated UI needs shared visual/behavior rules, an existing system has
drifted, or a product requires a coherent token/component foundation. Do not build
a component platform for a one-off page or replace an established library by default.

## Inventory and boundaries

Locate the current token/theme source, component library, styles, fonts/icons,
stories and accessibility conventions. Distinguish genuinely different roles from
accidental duplicates. Identify consumers before changing a public component API.
Document the requested surfaces and what remains outside the change.

## Model the useful system

Start with semantic roles, not a large palette dump. Separate raw primitives from
intent only when that distinction is useful in this stack. Reuse the current
token technology; do not duplicate values in a second JSON/CSS/JS representation
without a real build/consumption requirement.

Read [token and component contract](references/token-contract.md) for a compact
coverage model. Define color, type, spacing, layout, shape/elevation and motion
roles the product actually needs, including focus and status treatment. Choose
values from the visual direction or evidence, not a universal fashionable preset.

Components need behavior as well as appearance: semantic element, accessible name,
keyboard/focus contract, variants, states, density and responsive adaptation.
Use a documented accessible primitive where available instead of reimplementing
complex dialogs, menus or comboboxes for styling alone.

## Implement and migrate

Apply the foundation to a representative real flow before extracting more rules.
A token system is not validated by a swatch sheet alone. Check a long-content,
invalid/error, disabled and narrow state relevant to that flow.

Prefer incremental migration. Preserve consumers, describe intentional API/token
renames and avoid broad search-replace without understanding semantic roles.
Do not delete a token/component until its uses have been checked. Keep modified
user themes and deliberate product exceptions intact.

## Verify and record

Verify type/lint/build checks appropriate to the implementation and render the
representative states when tools permit. Check contrast on actual surfaces,
focus visibility, keyboard behavior and long-content reflow. If dark mode is
part of the product, verify it independently rather than relying on inversion.

Update the existing component examples or lightweight usage notes with practical
decisions and migration guidance. Do not require installing Storybook or another
dependency merely to document a small system.

Finish with the source of truth, changed components/tokens, validated consumers,
migration implications and actual gaps. Stop when the requested surfaces are
coherent and further abstraction would not serve a current consumer.
