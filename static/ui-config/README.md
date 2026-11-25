# GradStudio UI configuration

This directory is the constrained, versioned control surface for routine prompt-driven UI changes. `static/index.html` remains the canonical application shell. Configuration changes cannot contain arbitrary HTML or JavaScript and must pass the JSON Schemas and cross-file validation before the generated runtime bundle changes.

## Source files

- `registry.json` maps stable component IDs to exact source, style, behavior, routes, data dependencies, risk class and tests.
- `site.json` controls brand metadata and narrow feature flags.
- `navigation.json` controls the approved primary routes, labels, visibility and deterministic order.
- `home.json` controls hero copy/actions and the order/visibility of registered homepage blocks.
- `footer.json` controls footer copy, links, visibility and order.
- `theme.json` controls validated colors, typography, spacing, radii, shadows, breakpoints, motion and layout dimensions.
- `schemas/` rejects unknown keys, unsafe values and invalid structures.
- `generated/ui-config.runtime.js` is deterministic build output. Do not edit it directly.
- `apply-config.js` applies only validated data through safe DOM and CSS custom-property APIs.

Run `npm run ui:compile` after changing source configuration. Commit the source and generated output together. `npm run ui:validate` fails if generated output, the preview shell, component inventory, paths, hooks, links or assets are stale.

Advanced changes remain normal reviewed edits to HTML, CSS and JavaScript. Register new components and tests in the same change; do not expand the JSON format to execute code.
