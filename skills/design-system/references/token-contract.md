# A small useful token and component contract

## Token roles

| Family | Questions to settle |
|---|---|
| Surfaces | Canvas, content surface, elevated/overlay surface and boundaries |
| Text | Primary, secondary, inverse, link and status text on their real surfaces |
| Interaction | Default/hover/active/selected/disabled, focus ring and pending state |
| Status | Success, error, warning and informational states beyond color alone |
| Type | Reading face, display/heading/body/label/data roles, leading and wrapping |
| Space/layout | Repeated gaps, page gutters, content widths, density and adaptation |
| Shape/elevation | Shared radii, border treatment, meaningful layering |
| Motion | Purpose, duration/easing where needed, reduced-motion alternative |

Do not create unused token categories to complete the table. Keep semantic names
meaningful to the product and existing conventions. Prefer a small stable contract
over exposing every incidental pixel as a public API.

## Component record

For each component actually changed, capture its purpose, consumers, semantic
element, variants, state ownership and keyboard/focus behavior. Name required
content constraints such as truncation, multi-line labels and error descriptions.
Include what changes at narrow widths and where local scrolling is legitimate.

Complex interaction should be built from a known accessible primitive unless the
project requires custom behavior and that behavior can be verified. Styling does
not justify discarding a working keyboard or assistive-technology contract.

## Migration checks

Follow imports/usages before renaming or deleting a public token/component.
Check representative consumers rather than only an isolated component story.
Preserve intentional context-specific roles: an error outline and a decorative
brand outline may share a current color without meaning the same thing.

Record breaking changes and a concrete migration path. Do not silently alter a
component's default submission, navigation, focus or disabled behavior while
describing the change as visual cleanup.
