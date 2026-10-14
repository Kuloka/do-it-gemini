---
name: design
description: Create or refresh a repository design contract from product, UI, and accessibility evidence.
---

# Design

Use when UI/product decisions need a maintained source of truth.
This skill creates a design contract; it does not claim pixel matching or image generation.

## Discover

Read existing design docs, routes, layouts, components, theme files, assets, and tests.
Inspect supplied screenshots only with a real available image-capable tool.
Distinguish observed behavior from an inferred design intention.
Identify missing users/jobs, device targets, brand constraints, and reference assets.
Ask only questions that materially change the design and cannot be answered locally.
Record minor assumptions and unresolved items instead of inventing brand facts.

## Durable contract

Maintain `data/design/DESIGN.md` unless the repository already has a canonical `DESIGN.md`.
Keep a single source of truth and preserve useful existing content.
Include these sections with concrete decisions or explicit unknowns:

- Status, date, product surfaces, and evidence reviewed.
- Brand personality, trust signals, and styles to avoid.
- Product goals, non-goals, and success signals.
- Personas, user jobs, and contexts of use.
- Information architecture, navigation, and content hierarchy.
- Design principles and their tradeoffs.
- Color, typography, spacing, motion, imagery, and iconography.
- Components, states, variants, and token ownership.
- Accessibility target, semantics, keyboard, focus, contrast, and reduced motion.
- Responsive layout, touch behavior, and target devices.
- Loading, empty, error, success, disabled, and relevant offline states.
- Content voice, terminology, and useful microcopy rules.
- Implementation constraints and verification expectations.
- Open questions, their owners, and consequences.

Avoid generic aesthetic mandates unsupported by the product or references.
Reuse an established component and token system before proposing a replacement.

## Apply and verify

Cite the relevant contract when making a UI decision.
Update conflicting decisions explicitly instead of creating a second design system.
Check that the contract addresses the actual user flows and failure states.
For implementation, validate relevant accessibility and responsive behavior with available tools.
Report visual inspection gaps honestly when browser/screenshot tools are unavailable.
Stop when the contract is actionable and remaining decisions are named.
