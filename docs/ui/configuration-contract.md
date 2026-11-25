# Prompt-driven UI configuration contract

Status: Phase 3 implementation contract, 2026-11-24

Canonical shell: `static/index.html`

Machine registry: `static/ui-config/registry.json`

## Source decisions

- `static/index.html` is the only hand-edited canonical public shell.
- `static/gradstudio-learn-demo.html` is retained as a local compatibility preview and generated deterministically from the canonical shell. Its only intentional semantic difference is the preview-safe brand link. Direct edits are rejected by `npm run ui:compile:check`.
- `static/learn-next.*` is a retained design reference. It is not imported by the canonical shell and cannot be targeted by a routine production prompt.
- `static/gradstudioapplelike.html` is an archived standalone prototype retained for historical design reference. It is not imported by the canonical shell.
- Existing login and administration pages remain separate active/legacy surfaces exactly as classified in the registry. Configuration work does not imply that a legacy surface is secure or production-authoritative.

## Configuration boundary

Routine configuration may change only registered labels, copy, order, visibility, allowed feature flags, design tokens and bounded layout dimensions. Schemas reject unknown properties. The compiler additionally rejects executable strings, duplicate identifiers/order, missing required routes, invalid breakpoint order, missing assets, missing registry paths and component-key mismatches.

The generated adapter uses `textContent`, attribute setters, DOM creation and CSS custom properties. It does not accept markup, selectors, script expressions, event handlers or network locations from configuration. Configuration therefore cannot introduce arbitrary code.

Files and ownership:

| File | Routine control |
| --- | --- |
| `static/ui-config/site.json` | Brand metadata and narrow feature flags |
| `static/ui-config/navigation.json` | Existing primary route labels, visibility and order |
| `static/ui-config/home.json` | Hero copy/actions and registered homepage block order/visibility |
| `static/ui-config/footer.json` | Footer copy, links and order/visibility |
| `static/ui-config/theme.json` | Colors, fonts, spacing, radii, shadows, responsive reference breakpoints, motion and bounded layout sizes |
| `static/ui-config/registry.json` | Stable IDs, ownership, risk and test map; structural change |

## Code escape hatch

If a request needs a new component, interaction, route, data dependency, responsive behavior, authentication behavior or an unsupported visual treatment, edit the canonical HTML/CSS/JavaScript instead of smuggling code into JSON. The same change must:

1. assign a stable component ID and deterministic instance hook;
2. update the machine registry and human inventory;
3. classify risk and ownership;
4. add browser, accessibility and responsive coverage proportional to risk;
5. regenerate the preview/config bundle; and
6. remain independently reversible through Git.

Authentication, authorization, payments, operational data, APIs, schemas, Cloudflare bindings, workflows and deployment policy remain high risk even when a prompt describes them as a visual change.

## Component lifecycle semantics

- **Rename visible copy:** retain the stable component ID; edit validated configuration when the property is supported.
- **Move/reorder:** change explicit numeric order. IDs and underlying data remain unchanged. Duplicate orders fail validation.
- **Hide/remove visually:** set supported visibility to `false`. This never deletes educational or operational data.
- **Delete source component:** structural change. Remove source, registry/config references, selectors, styles, assets and tests in one reviewable commit. Verify routes and callers first.
- **Rename component ID:** avoid for presentation-only changes. When unavoidable, record an explicit old-to-new migration and update every selector, registry/config reference, test and prompt example atomically.
- **Move source files:** keep component ID stable; update registry, imports, asset references, generated preview and tests in the same commit.
- **Restore/undo:** revert the owning Git commit and rebuild the deterministic bundle. A prior application release remains the rollback unit.

## Asset rules

- Use lowercase descriptive filenames with hyphens and an appropriate extension; avoid timestamps unless the asset is intentionally immutable.
- Store public application assets under `static/`; educational assets belong in `Gradstudio-2.0`.
- Every informative image requires meaningful alternative text. Decorative images use an empty `alt` and must not carry meaning unavailable elsewhere.
- Optimize raster dimensions/encoding before commit. Prefer existing SVG/icon systems for vector UI.
- Replacing an asset should preserve its path only when cache/release semantics make replacement safe. Otherwise use a new immutable name and update references atomically.
- Remove an unreferenced asset only after link/reference checks pass. Git history provides source recovery; deployed-release retention follows the release policy.

## Validation

```powershell
npm ci
npm run ui:validate
npm run ui:test:browser
npm run ui:build:inventory
```

The compiler generates the runtime bundle and preview byte-for-byte. Integrity checks require all registry paths and hooks, exact inventory coverage, unique static IDs, valid local assets and the correct script order. Browser tests exercise canonical desktop/mobile routes against local synthetic fallback data with live APIs blocked.

Pull-request CI also emits a fail-closed path classification and hashed component-inventory artifact. Routine classification is only a candidate signal; it does not authorize deployment before the protected pipeline and initial production cutover are separately approved.

The initial configuration values reproduce the existing canonical copy, order, colors and layout. Any intentional visual change requires a founder request and refreshed approved screenshots.

## Recorded baseline accessibility debt

The first automated desktop/mobile axe run found pre-existing serious issues: insufficient contrast in the orange hero actions, selected topic/count and course metadata, plus nested pin buttons inside keyboard-interactive course-card containers. These are not suppressed globally. Exact normalized targets are recorded in `tests/ui/accessibility-baseline.json`; the browser suite fails for any new serious/critical target or unexpected baseline drift. Phase 4 accessibility acceptance remains incomplete until the visual/interaction fixes are reviewed and the baseline becomes empty.
