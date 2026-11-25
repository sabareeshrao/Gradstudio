# GradStudio UI component inventory

Status: Phase 3 machine-registry synchronized inventory, 2026-11-24
Repository: `sabareeshrao/Gradstudio`  
Canonical public shell: `static/index.html`

This registry tells future ChatGPT/Codex sessions where a visible feature lives and which stable identifier should be used in natural-language administration. It describes the current source; it does not promote prototypes to production.

## Canonical public assets

| Responsibility | Exact path | Current status |
| --- | --- | --- |
| Public HTML shell and static mount points | `static/index.html` | Canonical |
| Public layout, component, responsive, auth, detail, and player styles | `static/gradstudio-learn-demo.css` | Canonical |
| Public behavior, client routing, API catalog adapter, rendering, auth UI, pins, detail, and player | `static/gradstudio-learn-demo.js` | Canonical |
| Header logo | `static/gradstudio-header-logo.png` | Active asset |
| Preview shell | `static/gradstudio-learn-demo.html` | Generated local compatibility preview; not hand-edited or canonical |
| Legacy client catalog/fallback data | `static/gradstudio-learn-data.js` | Legacy; do not migrate to 2.0 |
| Login page | `static/login.html` | Active separate surface; verify routing before consolidation |

`static/gradstudio-learn-demo.html` is generated from `static/index.html`; the preview brand-link target is its only intentional semantic difference. Run `npm run ui:compile` after canonical shell/config changes. Direct preview edits fail deterministic validation.

## Machine-readable registry and configuration

- `static/ui-config/registry.json` is the validated machine-readable counterpart to this inventory.
- `static/ui-config/{site,navigation,home,footer,theme}.json` owns bounded routine settings.
- `static/ui-config/schemas/` rejects unsupported or executable configuration.
- `static/ui-config/generated/ui-config.runtime.js` and the preview shell are deterministic generated outputs.
- `static/ui-config/apply-config.js` applies validated values through safe DOM/CSS APIs before the canonical application script starts.
- `docs/ui/configuration-contract.md` defines lifecycle, assets and the code escape hatch.
- `docs/ui/prompt-operation-playbook.md` maps founder prompts to components, files, risk and tests.
- `docs/ui/change-classification.md` defines fail-closed routine, structural and high-risk path classification.
- `npm run ui:build:inventory` packages this inventory, the machine registry, agent instructions and policy documents with hashes, counts, revision and a content digest for CI review.

## Stable public component registry

The `component_id` values below are the intended durable names for prompt-driven administration. Current DOM selectors are evidence, not a guarantee of architectural separation. When the configuration layer is implemented, preserve these component IDs or record an explicit migration.

| Component ID | Visible responsibility | HTML mount/selector | Behavior/style owner | Data or route dependency | Change risk |
| --- | --- | --- | --- | --- | --- |
| `site.shell` | Whole public application wrapper | `.site-shell` in `static/index.html` | canonical CSS/JS | All public routes | Structural |
| `site.header` | Global top bar | `.topbar` | canonical CSS/JS | Auth state, responsive nav | Structural |
| `site.brand` | Header logo and name | `.brand`, `.brand-mark`, `.brand-name` | `static/index.html`, canonical CSS | `/` | Routine unless asset dimensions change |
| `site.primary-nav` | Home, Courses, About, Contact navigation | `.main-nav`, `[data-nav-home]`, `[data-nav-courses]`, `[data-nav-about]`, `[data-nav-contact]` | canonical JS route handlers | Home/catalog/info routes | Structural |
| `site.auth-actions` | Sign-up/sign-in or account controls | `.top-actions`, `[data-auth-open]`, dynamically rendered account selectors | canonical JS auth rendering | Auth API/session | High risk if behavior changes |
| `site.course-menu` | Course mega menu | `#courseMegaMenu`, `#courseMegaGroups`, `[data-course-menu-trigger]` | canonical JS topic/menu renderers | Catalog API | Structural |
| `home.hero` | Homepage title, message, CTAs | `#home`, `#heroTitle`, `.hero-heading`, `.hero-subheading`, `.hero-actions` | canonical HTML/CSS | Home route, auth CTA | Routine for copy; structural for layout |
| `home.hero-feature` | Featured module visual | `#heroCarouselCard` | canonical JS hero renderer | Catalog/featured item | Structural |
| `catalog.shell` | Catalog and topic layout | `#courses`, `.catalog-shell` | canonical CSS/JS plus `static/modules/content-catalog-v1.mjs` | Legacy catalog in production; Git catalog only on the exact staging host when the validated flag is enabled | Structural |
| `catalog.topics` | Topic sidebar and count | `.topics-panel`, `#topicList`, `#topicCount` | canonical JS topic renderer | Catalog topics | Structural |
| `catalog.header` | Catalog title and stats | `#catalogTitle`, `#courseCount`, `#topicCountStat` | canonical JS catalog renderer | Active filter/catalog | Routine for labels |
| `catalog.search` | Course search | `#courseSearch` | canonical JS input/filter logic | Client catalog | Structural if behavior changes |
| `catalog.pinned` | Pinned-items entry point and views | `[data-open-pinned]`, dynamic `[data-pinned-*]` selectors | canonical JS | Local/session account state | Structural |
| `catalog.active-filter` | Current topic/filter display | `#activeFilter` | canonical JS | Search/topic selection | Routine/structural |
| `catalog.course-grid` | Course cards | `#courseGrid`, dynamic `[data-course-card-id]` | canonical JS card renderer | Catalog API | Structural |
| `catalog.pagination` | Catalog paging | `#pager` | canonical JS pagination | Filtered course set | Structural |
| `course.detail` | Course overview and section list | `#courseDetail`, dynamic `[data-detail-section]`, `[data-lesson-index]` | canonical JS detail renderer | Course/category/section records | Structural |
| `course.player` | Lesson navigation and simulation frame | `#coursePlayer`, dynamic `.lesson-frame`, `[data-player-*]` | canonical JS player renderer plus `static/modules/content-catalog-v1.mjs` | Stable-ID Git simulation records use immutable content-origin URLs and an opaque sandbox; legacy production behavior is unchanged | High risk at content security boundary |
| `home.layout-blocks` | Homepage featured/compact carousel blocks | `#demoCarouselBlocks`; generated `#featuredDemoRail`, `#compactDemoRail`, `#carouselTextBlock`, `#compactCarouselTextBlock` | canonical JS layout renderers | Catalog/layout configuration | Structural |
| `auth.page` | Sign-up/sign-in/reset-style client UI | `#authPage`, dynamic `[data-auth-form]`, `[data-auth-tab]`, `[data-google-auth]` (legacy), `[data-google-id-button]` (isolated staging) | canonical JS | Authentication API and OAuth | High risk |
| `info.page` | About/contact/legal content routed inside shell | `#infoPage`, `[data-info-page]` | canonical JS | Client routes | Routine/structural |
| `site.footer` | Footer brand/navigation/legal line | `.site-footer`, `.footer-links`, `[data-info-page]` | `static/index.html`, canonical CSS/JS | Home/info routes | Routine |

## Dynamic components without static IDs

These are generated by `static/gradstudio-learn-demo.js` and must be covered even though they do not have a permanent static DOM ID:

| Component ID | Current selectors or renderer behavior | Notes |
| --- | --- | --- |
| `account.menu` | `[data-account-menu-trigger]`, `[data-account-menu]`, `[data-auth-logout]` | Replaces header auth actions after sign-in. |
| `account.pinned-view` | `[data-pinned-card]`, `[data-pinned-remove]`, `[data-pinned-media-course-id]` | No standalone user dashboard currently exists. |
| `catalog.course-card` | `[data-course-card-id]`, `[data-course-id]`, `[data-pin-course]` | Instances are keyed by course IDs. |
| `course.detail-section` | `[data-detail-section]` and its generated `aria-controls` target | Keep generated IDs deterministic and accessible. |
| `course.player-section` | `[data-player-section]`, `[data-player-lesson]`, `[data-player-search]` | Coupled to player navigation and iframe rendering. |
| `course.simulation-frame` | `.player-frame-shell`, `.lesson-frame`, `iframe[data-srcdoc]` | The staging Git-content path uses `sandbox="allow-scripts allow-forms"` and `referrerpolicy="no-referrer"`; legacy production retains its existing sandbox until authorized cutover. |
| `home.carousel-block` | `.demo-carousel-block`, `.carousel-viewport`, `[data-carousel-target]`, `[data-carousel-card-key]` | Generated IDs are runtime-specific today. |

## Administration surfaces

| Component ID | Exact paths | Responsibility | Status/risk |
| --- | --- | --- | --- |
| `admin.catalog-editor` | `static/gradstudio-learn-admin.html`, `static/gradstudio-learn-admin.js` | Existing course/module/simulation management | Active but must transition to GitHub-backed content; high risk |
| `admin.content-status` | `static/admin-content-status.html`, `static/admin-content-status.mjs` | Read-only Git catalog/release evidence | Preparatory; no D1/R2/Git mutation controls; structural |
| `admin.security` | `static/admin-security.html` | Operational security administration | High risk; server authorization required |
| `admin.legacy-editor` | `static/admin-edit.html` | Older editor surface | Legacy; verify before removal |
| `admin.bulk-tools` | `static/Admin.html` | Specialized/bulk administration | Legacy/specialized; verify before removal |
| `admin.preview` | `admin-preview/` | Administration preview assets | Preview only unless explicitly promoted |

Client-side admin checks are never an authorization boundary. Every administrative API route must enforce server-side identity, role, and request protections before these surfaces are considered safe.

### Current administration and login DOM anchors

These IDs document the present implementation for targeting and regression tests. They do not make a page safe or canonical by themselves.

| Component ID | Exact path | Current static DOM IDs |
| --- | --- | --- |
| `auth.standalone-login` | `static/login.html` | `#error`, `#login-form`, `#email`, `#password`, `#submit-btn` |
| `admin.catalog-editor.toolbar` | `static/gradstudio-learn-admin.html` | `#btnNewFolder`, `#btnNewCourse`, `#btnCarousel`, `#folderJump`, `#btnDelFolder`, `#btnRecycle` |
| `admin.content-status` | `static/admin-content-status.html` | `[data-component-id='admin.content-status']`, `#catalogState`, `#sourceCommit`, `#activeRelease`, `#catalogDigest`, `#deploymentStatus`, `#catalogCounts`, `#catalogTree`, `#refreshStatus` |
| `admin.catalog-editor.tree` | `static/gradstudio-learn-admin.html` | `#tree`, `#mainArea`, `#emptyState` |
| `admin.catalog-editor.course-form` | `static/gradstudio-learn-admin.html` | `#courseForm`, `#formTitle`, `#cId`, `#cTitle`, `#cDescription`, `#cLevel`, `#cLabs`, `#cIcon`, `#cOrder`, `#cParent`, `#cType`, `#cTags`, `#cThumbType`, `#cThumbImage`, `#cThumbHtml`, `#cAllOrder`, `#snippetLibrary`, `#coursePreview`, `#btnSaveCourse`, `#btnDelCourse` |
| `admin.catalog-editor.contents` | `static/gradstudio-learn-admin.html` | `#contentsCard`, `#btnAddSection`, `#sectionsList`, `#carouselArea`, `#recycleArea`, `#modalBg`, `#modalBox`, `#toast` |
| `admin.security.tabs` | `static/admin-security.html` | `#tab-btn-security`, `#tab-btn-analytics`, `#tab-security`, `#tab-analytics`, `#refresh-timer` |
| `admin.security.monitoring` | `static/admin-security.html` | `#overview-cards`, `#failed-logins-table`, `#locked-accounts-table`, `#threats-table`, `#analytics-overview`, `#chart-views`, `#chart-top-content`, `#reports-table` |
| `admin.legacy-editor.shell` | `static/admin-edit.html` | `#sidebar-content`, `#main-title`, `#header-actions`, `#main-content`, `#modal-overlay`, `#modal-content`, `#toast` |
| `admin.legacy-editor.forms` | `static/admin-edit.html` | `#edit-cat-form`, `#add-cat-form`, `#add-course-form`, `#edit-course-form`, `#add-sec-form`, `#edit-sec-form`, `#add-sim-form`, `#edit-sim-form`, `#bulk-import-form`, `#bulk-files`, `#bulk-json`, `#add-carousel-form`, `#edit-carousel-form`, `#edit-header-form`, `#card-form` |
| `admin.bulk-tools` | `static/Admin.html` | `#path-input`, `#gen-course-id`, `#gen-section-id`, `#bulk-form`, `#bulk-type`, `#bulk-data`, `#bulk-status`, `#example-json` |

`static/admin-edit.html` also generates runtime IDs from category, course, section, simulation, carousel and card IDs. Those must be made deterministic and validated before the legacy editor can participate in prompt-driven administration.

## Alternate and redirect surfaces

| Exact path(s) | Classification | Rule |
| --- | --- | --- |
| `static/learn-next.html`, `static/learn-next.css`, `static/learn-next.js` | `prototype.learn-next` — retained design reference | Not imported by the canonical shell; promotion requires an approved structural change. |
| `static/gradstudioapplelike.html` | `prototype.applelike` — archived prototype | Retained for historical design reference and excluded from the canonical runtime. |
| `static/about.html`, `static/contact.html`, and legal/info HTML redirects | Route shims/redirect surfaces | Verify incoming links before editing or removing. |

## Backend and delivery ownership

| UI dependency | Exact source path | Notes |
| --- | --- | --- |
| Static asset delivery and API routing | `worker/src/index.js` | Production retains its R2 path; isolated Git-content staging uses the `ASSETS` binding and exact content-origin CSP. Security audit applies. |
| Auth middleware | `worker/src/middleware/auth.js` and related middleware | High-risk boundary; UI state is not proof of authorization. |
| Cloudflare bindings/routes | `worker/wrangler.toml`, `worker/wrangler.staging.example.toml` | Production remains live and protected. Staging is a separate Worker with isolated D1/KV resources, Static Assets, and a service binding to the content-staging Worker. |
| Schema and migrations | `worker/schema.sql`, `worker/migrations/` | Operational data remains outside GitHub; definitions stay tracked here. |

## Inventory maintenance rules

- Update this file in the same commit as any add, delete, move, rename, route change, canonical-path change, or component-ID change.
- `npm run ui:check` enforces that every machine-registry ID appears here and that every public/dynamic registry entry has a deterministic source hook.
- Give every new independently administered UI region a stable `component_id`.
- Record whether the component is configuration-controlled or code-controlled once the UI registry is implemented.
- Record all API, auth, content, and operational-data dependencies.
- Never point a routine prompt at a prototype merely because its filename looks newer.
- Removing a component requires tests for navigation, responsive layout, accessibility, orphaned selectors, and broken links.
- Moving or renaming a component must preserve or intentionally migrate stable IDs so prompt history remains meaningful.


