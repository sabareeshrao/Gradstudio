# Founder prompt-operation playbook for application UI

Use this playbook to translate a natural-language request into the smallest safe application change. Educational hierarchy and simulation content still belong in `sabareeshrao/Gradstudio-2.0`.

## Routing a request

1. Identify the stable component ID in `static/ui-config/registry.json` and `docs/ui/component-inventory.md`.
2. Decide whether the request is routine configuration, structural frontend code, or high-risk behavior/infrastructure.
3. Edit only the owning source and regenerate deterministic output.
4. Run registry/config/integrity tests plus affected desktop/mobile browser tests.
5. Report commit, validation evidence, the revision-labeled remote preview, merge/deployment status and rollback commit. Never describe a commit as staged merely because a preview exists.

## Common prompt mappings

| Founder request | Component/operation | Expected files | Risk |
| --- | --- | --- | --- |
| “Rename Courses to Learning” | `site.primary-nav`; copy | `navigation.json`, generated bundle/preview | Routine |
| “Move Contact before About” | `site.primary-nav`; reorder | `navigation.json`, generated bundle/preview | Routine |
| “Change the homepage heading” | `home.hero`; copy | `home.json`, generated bundle/preview | Routine |
| “Hide the homepage preview blocks” | `home.layout-blocks`; visibility | `home.json` or approved site flag, generated files | Routine |
| “Make the sidebar narrower and cards compact” | `catalog.shell`, `catalog.course-grid`; tokens | `theme.json`, generated bundle | Routine within schema bounds |
| “Change our colors and spacing” | registered theme tokens | `theme.json`, generated bundle | Routine; contrast/visual tests required |
| “Remove the homepage hero” | `home.hero`; visual removal | `home.json`, generated bundle/preview | Routine visual removal; underlying data untouched |
| “Add an existing registered block above the catalog” | homepage block order | `home.json`, generated bundle/preview | Routine only when already registered |
| “Add a new navigation destination” | new route/component | HTML/JS/CSS, registry, configs, tests | Structural |
| “Create a new course-card interaction” | `catalog.course-card` | canonical JS/CSS, registry/inventory, tests | Structural |
| “Redesign login” | `auth.page` / `auth.standalone-login` | canonical frontend source and tests | Structural; auth semantics must remain unchanged |
| “Change who can administer content” | auth/admin boundary | Worker and security tests | High risk; explicit protected approval |
| “Delete a component” | component lifecycle | all source/references/tests | Structural; verify callers and preserve data |
| “Undo the last UI update” | Git revert/rollback | owning commit/release | Risk follows reverted change |

## Operation rules

- **Add:** reuse a registered implementation through configuration when possible. A novel component uses the code escape hatch and receives a new stable ID.
- **Delete:** distinguish visual removal from data deletion. Routine configuration may hide registered UI; source deletion requires caller, selector, asset, link and responsive checks.
- **Move/reorder:** change explicit order, never infer order from object keys or filenames.
- **Rename:** preserve stable IDs for visible-label changes. Component-ID renames require a documented migration.
- **Copy:** edit only text fields that schemas expose. Markup and event handlers are never configuration copy.
- **Style:** prefer shared tokens. Component-specific or novel styling is a structural CSS change with screenshots.
- **Responsive:** token changes must pass desktop/mobile/tablet views. New breakpoint behavior is code because CSS media queries are not executable configuration.

Routine changes become eligible for automatic production deployment only after the isolated pipeline and initial production cutover are explicitly authorized. Until then, validation and local preview do not modify production.

For an existing homepage heading, hero action label or footer description/copyright change, use only the registered JSON and regenerated runtime; the semantic staging copy lane selects targeted browser validation automatically. Do not manually refresh structural screenshots for these text-only edits. All other operations retain their full gates. See [change classification](change-classification.md).

Eligible copy-only pull requests are merged by trusted automation after every required check succeeds and are then dispatched to isolated staging. Structural and high-risk changes remain review-controlled. The unpromoted PR alias is the fastest visual feedback path; staging remains the integration proof.
