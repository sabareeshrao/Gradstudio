# Administration ownership and transition

Status: source inventory and transition decision, 2026-11-25. This document does
not activate the new catalog, disable a production route, or authorize a
deployment.

## Decision

Daily educational administration is GitHub-first. ChatGPT/Codex changes the
public `sabareeshrao/Gradstudio-2.0` repository through the versioned schemas,
validation, and deployment workflow. The application repository continues to
own operational administration: users, authentication, payments, entitlements,
progress, engagement, analytics, moderation, and security.

A browser-to-GitHub write-back service is not needed for the initial release.
The founder's ChatGPT/GitHub workflow already supplies the intended create,
rename, move, reorder, publish, retire, review, and rollback interface. Adding a
second writer now would add credentials and conflict handling without removing
a required founder step. Reconsider this only if staging evidence shows that a
routine operation cannot be completed through the prompt workflow. If it is
later needed, it must be a narrow server-side GitHub App; a browser must never
receive a repository write credential.

## Current screen inventory

| Surface | Exact source | Current actions | Future owner/state |
| --- | --- | --- | --- |
| Primary catalog editor | `static/gradstudio-learn-admin.html`, `static/gradstudio-learn-admin.js`, `static/admin-drag.js` | Browse categories/courses/sections/simulations; create, edit, upload, replace, reorder, archive, restore, permanently delete; edit carousel layout/cards/media | Isolated Git-content staging redirects this HTML surface to `admin-content-status.html` and rejects its educational API calls. Production remains unchanged until cutover authorization. Carousel structure/design moves to application Git configuration; educational references/order come from the content catalog. |
| Git content status | `static/admin-content-status.html`, `static/admin-content-status.mjs` | Read source commit, release ID, digest, adapter/deployment state, and the published hierarchy | Preparatory read-only Git-derived view. It checks administrator identity but exposes no D1, R2, Cloudflare, or GitHub mutation control. It does not activate the new catalog or replace the legacy editor before cutover. |
| Security and analytics dashboard | `static/admin-security.html` | Security overview, failed logins, locked accounts, threat events, IP unblock, account unlock, engagement analytics, content deep dive, trends, moderation reports | Remains a secured application-admin surface backed by operational data. Content titles may be joined by stable simulation ID, but Git does not own the metrics or moderation state. |
| Legacy catalog editor | `static/admin-edit.html` | Older all-in-one category/course/section/topic, upload, carousel, recycle-bin, restore, and permanent-delete editor | Redirected to the read-only status surface only in isolated Git-content staging. Retained without production behavior change until the production cutover is separately authorized. It must not become a second content writer. |
| Admin preview copy | `admin-preview/index.html` | Preview variant of the legacy catalog editor | Non-canonical preview only. Do not treat it as the source for new administration behavior. Remove only after route/caller verification. |
| Bulk JSON importer | `static/Admin.html` | Generate/import course, section, and simulation JSON through `/api/admin/bulk-import` | Redirected to the read-only status surface only in isolated Git-content staging; its API is also rejected there. Production is untouched pending cutover authorization. Git manifests and compiler validation replace it. |
| Worker admin API | `worker/src/index.js`, handlers under `worker/src/handlers/` | Operational actions, educational CRUD/uploads/reorder, analytics, moderation, and legacy setup/migration actions | Split by the endpoint ownership tables below. Server-side authorization remains mandatory for every retained operational action. Runtime setup/migration routes stay fail-closed. |

No dedicated payment-management screen exists in the inspected static admin
files. Payment and entitlement data nevertheless remain operational application
data and must never move to the public content repository.

## Action and endpoint ownership

The path groups below inventory the current application contract. A parameter in
braces represents the corresponding dynamic route in `worker/src/index.js`.

### Operational application administration — retain securely

| Capability | Current endpoints | Source of truth |
| --- | --- | --- |
| User access and roles | `GET /api/admin/users`, `PUT /api/admin/users/{id}/role` | Secured application database |
| Security overview | `GET /api/admin/metrics/overview`, `/auth`, `/threats`, `/users` | Security/session/audit stores |
| Incident response | `POST /api/admin/metrics/unblock-ip`, `/unlock-account` | Secured runtime controls and audit log |
| Engagement/content metrics | `GET /api/admin/metrics/content`, `/analytics/overview`, `/analytics/content`, `/analytics/content/{simulationId}`, `/analytics/trends` | Operational analytics keyed by stable content ID |
| Moderation | `GET /api/admin/metrics/analytics/reports`, `POST /api/admin/metrics/analytics/reports/{reportId}/resolve` | Operational reports/moderation store |

These actions remain application-owned even when they refer to a course or
simulation. Git provides descriptive educational metadata; it does not own
accounts, activity, reports, progress, payments, or enforcement state.

### Legacy educational mutation — retire at cutover

| Capability | Current endpoints |
| --- | --- |
| Category CRUD/order/recovery | `/api/admin/categories`, `/api/admin/categories/{id}`, `/api/admin/categories/reorder`, `/api/admin/categories/deleted`, `/api/admin/categories/{id}/restore`, `/api/admin/categories/{id}/permanent` |
| Course CRUD/order/recovery | `/api/admin/courses`, `/api/admin/courses/{id}`, `/api/admin/courses/reorder`, `/api/admin/courses/deleted`, `/api/admin/courses/{id}/restore`, `/api/admin/courses/{id}/permanent` |
| Section CRUD/order/recovery | `/api/admin/sections`, `/api/admin/sections/{id}`, `/api/admin/sections/reorder`, `/api/admin/sections/deleted`, `/api/admin/sections/{id}/restore`, `/api/admin/sections/{id}/permanent` |
| Simulation CRUD/order/recovery | `/api/admin/simulations`, `/api/admin/simulations/{id}`, `/api/admin/simulations/reorder`, `/api/admin/simulations/deleted`, `/api/admin/simulations/{id}/restore`, `/api/admin/simulations/{id}/permanent` |
| File/import synchronization | `/api/admin/upload-simulation`, `/api/admin/replace-simulation`, `/api/admin/bulk-upload`, `/api/admin/bulk-import`, `/api/admin/sync-content` |
| Legacy carousel mutation | `/api/admin/learn-carousels`, `/api/admin/carousels`, `/api/admin/carousels/{id}`, `/api/admin/carousel`, `/api/admin/carousel/{id}`, `/api/admin/carousel/upload`, `/api/admin/carousel/reorder`, `/api/admin/carousels/reorder` |

These endpoints are historical application/D1/R2 writers. They are not the
authoring interface for the fresh content library. Until an authorized cutover,
their production behavior is left untouched to preserve the existing site. At
cutover they must reject new-library mutations or be removed, while the admin
catalog reads the Git-derived adapter. There is no silent fallback to legacy
educational content.

### High-risk maintenance — never routine administration

`/api/admin/migrate`, the `migrate-*-table` routes, setup routes, and debug
storage routes are deployment/migration responsibilities, not dashboard
features. The security remediation keeps them fail-closed by default. Any
replacement uses ordered migrations and a separately authorized release; these
routes must not be re-enabled to make administration convenient.

## Initial read-only educational admin target

The first Git-backed admin view should consume the same versioned adapter as the
student application and display:

- explicit empty, unconfigured, unavailable, incompatible, ready, and rolled
  back states;
- source repository and immutable source commit;
- content release ID, catalog digest, schema/compiler versions, and content
  origin;
- category/course/section/simulation hierarchy and publication state by stable
  ID;
- validation and deployment status with links to GitHub evidence when that
  evidence is available;
- application revision and content revision separately.

It must not submit educational mutations to D1 or R2. Operational metrics may
join catalog labels by stable ID, but missing catalog metadata must not delete or
rewrite an operational record.

## Archive, deletion, and emergency procedures

### Educational content

1. Prefer `published: false` for a reversible unpublish and the schema's retired
   state for a deliberate archive.
2. Keep stable IDs reserved. A rename or move changes metadata/path, not identity.
3. Commit the smallest manifest/source change, validate it, and let the trusted
   content workflow create the derived release. Never edit D1/R2 as a parallel
   source.
4. Removing source files is a structural Git change and requires reference/path
   validation. Git history remains the rollback record.
5. Irreversible removal of legacy production objects is a separate founder
   decision; a content retirement is not authorization to delete them.

### Website UI

Hide or remove a component through its registered configuration or a normal
application-code commit. Update the component inventory in the same change.
Deleting a visual component never deletes educational or operational data.

### Operational records

Use archive, disable, revoke, or status transitions defined by the secured
application domain and its retention rules. Do not place exports or personal,
payment, progress, or security data in Git. Permanent record deletion requires a
specific authorized procedure and auditable target list.

### Emergency

- For a bad content release, activate the retained known-good content release;
  do not redeploy the application unless compatibility requires it.
- For a bad application release, restore the known-good application version;
  do not republish content unnecessarily.
- For credential or access compromise, follow the private incident-response and
  credential-rotation runbook, revoke first, and preserve audit evidence.
- Emergency rollback authority does not authorize resource deletion, schema
  mutation, or the initial production cutover.

## Cutover gates

Direct educational mutations may be disabled only after all of the following
are true: isolated staging is operational; the Git-derived catalog is rendered
read-only in admin; routine Git operations pass end to end; rollback is proven;
operational regression tests pass; exact endpoints and production targets are
reviewed; and the founder explicitly authorizes the identified cutover. Until
then, this document is preparation, not a production toggle.
