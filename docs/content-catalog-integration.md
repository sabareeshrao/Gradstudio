# GradStudio 2.0 content integration boundary

## Current production-compatible path

The existing application remains unchanged for active users. Its catalog path is still D1/R2-backed:

- `GET /api/categories`, `GET /api/courses`, and `GET /api/courses/:courseId` read educational hierarchy from D1.
- `GET /api/simulations/:slug`, search, recent, legacy carousel endpoints, and `/simulations/*` use existing D1/R2 data.
- `static/gradstudio-learn-demo.js` normalizes those responses, caches them under `gradstudio-live-data-v1`, and drives topics, cards, detail, sections, and player routes.
- The current player uses `#course/<course-id>` and `#lesson/<course-id>/<numeric-index>`-style state and loads the legacy simulation URL into an iframe.
- Pins use course IDs but module pins currently include a lesson index. New-content progress/pins must use stable course, section, and simulation IDs before cutover so rename/move/reorder does not change identity.
- Authentication, payments/entitlements, pins, analytics, comments, likes, reports, and customer progress are operational data. They remain in application-owned services and must never be copied into the public content repository.
- Existing educational admin routes write D1/R2. They remain available only for the untouched legacy production path during transition; they must not become an editing path for GradStudio 2.0 content.

## New versioned boundary

`GET /api/content/v1/catalog` is an additive endpoint implemented by `worker/src/content/catalogAdapter.js`. It prefers the `CONTENT` service binding and can use an exact HTTPS `CONTENT_ORIGIN` only when a binding is unavailable. It never reads application D1, R2, or KV and never falls back to legacy content.

The adapter enforces:

- contract `gradstudio-content-catalog/v1` and schema version 1;
- expected public source repository and 40-character commit;
- release ID, release base URL, and simulation release-path consistency;
- HTTPS content origin;
- 2 MiB catalog response limit and JSON content type;
- globally unique stable IDs and published-only entities;
- category/course/section/simulation/shared-asset references;
- SHA-256 catalog digest integrity;
- explicit `ready`, `unconfigured`, `unavailable`, and `incompatible` states with safe diagnostics.

The endpoint exposes the content release ID, Git commit, and catalog digest already present in the catalog. App release identity remains available through the application deployment record. Staging evidence must record both revisions together.

`static/modules/content-catalog-v1.mjs` is the client-side mapping boundary. It maps catalog records without inventing legacy values, produces stable progress keys (`course:<id>` and `simulation:<id>`), resolves simulation URLs only on the catalog's independent HTTPS origin and active immutable release, and preserves stable identity across rename, move, and reorder.

## Compatibility behavior

| State | Application behavior at activation |
|---|---|
| Ready, empty | Render the designed empty-library state; do not show legacy content. |
| Ready, populated | Render only the Git-derived catalog release. |
| Unconfigured | Show a non-sensitive setup diagnostic in non-production; do not query legacy catalog endpoints. |
| Unavailable | Show a retryable content-unavailable state; do not silently use D1/R2 educational data. |
| Incompatible | Block the catalog and report contract/digest diagnostics; do not partially render it. |
| Rolled back | Accept the older valid release and retain stable-ID operational associations. |

The server and client adapters are locally tested. The active shell now has a staging-only activation path: it is enabled only when the validated `gitContentCatalogStaging` flag is true **and** the browser is on the exact isolated application-staging hostname. Localhost may opt in with `?contentSource=git` for automated browser tests. Production hostnames cannot activate this path through a query parameter. The staging path renders only the Git-derived catalog, records the content release/digest for diagnostics, suppresses legacy educational carousel reads, embeds the catalog's immutable simulation URL, and removes `allow-same-origin` from the content iframe. At the Worker boundary, Git-content staging requires the `CONTENT` and `ASSETS` bindings, serves the checked-in application UI through versioned Workers Static Assets, explicitly allows only the content-staging origin in `frame-src`, and rejects every legacy educational catalog or authoring route. Operational auth, progress, engagement, analytics, moderation, and security routes remain application-owned. Production continues to use the existing catalog and R2 static path until an authorized cutover.

On staging, the open application polls the no-store catalog every 15 seconds and immediately on tab focus/visibility restoration. A changed release ID, source commit, or catalog digest updates topics, cards, detail routes, and diagnostics in place without a manual reload. Failed background refreshes retain the last verified catalog and retry later; they never fall back to the legacy educational source.

## Staged activation plan

1. Deploy the content Worker and application Worker only in the separate non-production account.
2. Configure the application `CONTENT` service binding to `gradstudio-content-staging`.
3. Test empty and synthetic catalogs plus independent app/content rollout and rollback combinations.
4. Verify the implemented staging-only topics, cards, detail, sections, search, empty/error states, and player mapping against the deployed origin. Educational carousels remain empty rather than reading the legacy catalog.
5. Use the content-origin URL in an iframe sandbox without `allow-same-origin`; validate CSP, keyboard, mobile, entitlement display, analytics, pins, and stable progress keys.
6. Convert educational admin screens to GitHub-first guidance/read-only release status while leaving operational admin functions intact.
7. Keep all production routes and legacy content untouched until the founder authorizes cutover.

The protected staging deployment and rollback workflow, required GitHub
environment variables, and least-privilege token scope are documented in
[`docs/deployment/application-staging.md`](deployment/application-staging.md).

No step in this document authorizes a Cloudflare deployment, D1 mutation, R2 mutation, or production cutover.
