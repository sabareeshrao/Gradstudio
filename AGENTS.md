# GradStudio application repository instructions

These instructions apply to the entire `sabareeshrao/Gradstudio` repository.

## Repository role

This repository is the source of truth for the GradStudio application: the public website UI, authentication and account experiences, administrative interfaces, API/backend code, database migrations, and Cloudflare application-worker configuration.

It is **not** the source of truth for new educational simulations, courses, sections, categories, or educational metadata. Those belong in `sabareeshrao/Gradstudio-2.0`. Do not copy or migrate the legacy educational catalog into that repository.

The private `sabareeshrao/Gradstudio-2.0-Admin` repository owns requirements, implementation tracking, administration policy, and cross-repository operating documentation.

## Read before changing anything

1. Read this file and `README.md`.
2. For UI work, read `docs/ui/component-inventory.md` and inspect the current canonical files rather than relying on filenames alone.
3. For backend, authentication, admin, data, deployment, or Cloudflare work, read `docs/security/README.md` and the detailed private audit at `sabareeshrao/Gradstudio-2.0-Admin/docs/security/2026-11-24-baseline-audit.md`.
4. Check the private master tracker and founder decisions before changing architecture or repository boundaries.
5. Inspect `git status` and preserve unrelated user work.

## Current source map

- `static/index.html` — canonical public application shell.
- `static/gradstudio-learn-demo.css` — active public UI styling.
- `static/gradstudio-learn-demo.js` — active public UI behavior, routing, catalog rendering, authentication UI, account menus, course detail, and player.
- `static/login.html` — separate login surface.
- `static/gradstudio-learn-admin.html` and `.js` — current catalog administration UI.
- `static/admin-security.html` — operational security administration UI.
- `static/admin-edit.html` and `static/Admin.html` — legacy/specialized admin surfaces; verify callers before editing.
- `static/learn-next.*` and `static/gradstudioapplelike.html` — prototypes/alternatives, not canonical production UI unless the tracker explicitly promotes them.
- `worker/src/index.js` — application Worker routes and orchestration.
- `worker/src/middleware/` — authentication, authorization, rate-limit, CSRF, validation, and scanner helpers.
- `worker/migrations/` and `worker/schema.sql` — persistent-data definitions; never run against production without explicit authorization.
- `worker/wrangler.toml` — Cloudflare bindings and environments; it currently references shared live resources and is unsafe for casual development deployment.
- `scripts/` and root deployment scripts — operational utilities; treat any live endpoint, D1, KV, or R2 mutation as high risk.

The complete UI ownership and selector registry is maintained in `docs/ui/component-inventory.md`. Update that inventory in the same commit whenever a component, stable ID, canonical path, route, or ownership boundary changes.

## Change rules

- Preserve existing website behavior and operational data unless the task explicitly changes them.
- Keep application/UI deployment independent from educational-content deployment.
- Prefer stable component IDs and configuration-backed routine edits. Advanced visual or behavioral changes may modify HTML, CSS, and JavaScript directly.
- Keep secrets, credentials, customer data, tokens, payment data, and private administration details out of source control and generated previews.
- Do not add new educational content here. Application fixtures used solely for tests must be obviously synthetic.
- Do not migrate or publish legacy educational content.
- Do not use GitHub Pages as a production dependency.
- Do not make D1, KV, R2, DNS, route, secret, customer-data, or production changes without explicit founder authorization.
- A request to edit code is not authorization to deploy it.
- Routine eligible changes may become auto-deployable only after the approved validation and environment-isolation phases are complete. Until then, deployment is blocked.
- Every change must be reviewable and reversible through Git. Never hide generated source changes or mutate production outside the recorded deployment workflow.

## Risk classes

- **Routine:** copy, labels, ordering, colors, spacing, assets, and registered component configuration. Validate automatically; eligible for routine deployment only after the pipeline is approved.
- **Structural:** add/remove/move/rename UI components, route changes, shared layout changes, dependency changes, or direct HTML/CSS/JS work. Require full UI, accessibility, and responsive validation.
- **High risk:** authentication, authorization, admin access, payments, D1 schema/data, secrets, Cloudflare bindings/routes, deployment policy, or destructive operations. Require explicit founder approval before production execution.

Deletion requests should remove source through a normal Git commit. For operational records, prefer archival/disablement unless the founder explicitly requests irreversible deletion and the data-retention policy permits it.

## Validation

Run the smallest relevant set and report results. Current baseline commands are:

```powershell
Set-Location worker
npm ci
npm test
```

Until dedicated UI automation lands, also syntax-check every modified JavaScript file and manually verify the affected routes at desktop and mobile widths. Structural UI changes must eventually pass the approved automated suite covering:

- desktop and mobile rendering;
- keyboard navigation and focus behavior;
- navigation, auth entry points, account/pinned UI, catalog filtering, course detail, and player routes;
- accessibility checks;
- broken links/assets and console errors;
- visual-regression snapshots for registered components.

Do not weaken a failing validation to make a change pass. Record missing coverage in the private tracker.

## Deployment model

The approved target uses GitHub Actions for validation and controlled deployment. The application Worker serves the website UI and API. A separate content Worker serves compiled simulations from `Gradstudio-2.0`, initially evaluated with Cloudflare Workers Static Assets. The application consumes published content contracts without making the application repository the educational-content source of truth.

Production deployment always requires the safeguards documented in the private admin repository. At the time this file was created, no production deployment was authorized.


