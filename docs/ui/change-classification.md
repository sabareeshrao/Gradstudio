# Application UI change classification

Status: Phase 4 validation policy, 2026-11-24

This policy classifies changed repository paths before any future application release workflow decides whether a change can proceed. Classification never authorizes production deployment by itself.

## Classes

| Class | Examples | Required handling |
|---|---|---|
| Routine candidate | schema-bounded site/navigation/home/footer/theme JSON, deterministic generated configuration/preview, public image/font assets | full UI validation and visual tests; automatic production deployment is allowed only after the initial cutover and a protected deployment policy are separately enabled |
| Structural | canonical HTML/CSS/JavaScript, registry/schema, UI tests/scripts/docs, locked UI dependencies | full responsive/visual validation, component-inventory review, and the future structural release policy; never routine auto-deployment |
| High risk | Worker/API/schema/bindings, auth/admin surfaces, operational scripts, deployment helpers, GitHub workflows, unregistered paths | full relevant security validation and explicit founder approval before production execution |

Mixed changes take the highest class. Unknown paths fail closed as high risk. A generated file does not lower the class of another changed source file.

`scripts/ui/classify-ui-change.mjs` emits a deterministic JSON record containing the per-file reason, aggregate class, required gates, and an explicit `productionDeploymentAuthorized: false`. CI attaches this record to the UI administration artifact. A later deployment workflow must independently combine a routine-candidate result with protected-environment state, successful required checks, an approved initial cutover, and an immutable release digest.

## Local examples

```powershell
npm run ui:classify -- --file static/ui-config/home.json --file static/ui-config/generated/ui-config.runtime.js
npm run ui:classify -- --base main --head HEAD --output dist/ui-change-classification.json
```

The first command should report `routine`; the second classifies the actual Git diff. Neither command deploys or accesses Cloudflare.

## Artifact ownership

`npm run ui:build:inventory` packages the machine registry, exact-path component inventory, configuration contract, prompt-operation playbook, component/risk counts, source revision, per-file SHA-256 hashes, and a content digest. Pull-request CI publishes this alongside the classification record without production secrets. Future ChatGPT/Codex sessions can inspect that artifact to identify the owning repository and files before applying a prompt.

## Staging-only copy fast lane and automatic merge

A second semantic Git diff gate (`scripts/ui/staging-ui-lane.mjs`) selects targeted UI validation only for regular modifications of the allowlisted homepage hero text/action labels/accessible label and footer description/copyright, accompanied by the deterministic runtime bundle. All compiler/schema/integrity/unit checks still run. Actual copy, action destinations, navigation, accessibility and overflow are verified at desktop/tablet/mobile widths and screenshots retained. Unknown fields, route/flag/visibility/theme/asset/code changes, additions/deletions/renames/mode changes, generated-only diffs, missing or divergent revisions fall back to full validation. Security CI, staging Worker validation, dry-run, deployment and rollback are unchanged; production remains unauthorized.

Structural pixel snapshots use fixed presentation copy from `tests/ui/browser/visual-copy-fixture.json` so intentional text edits do not invalidate structural baselines. Actual current copy is separately verified and captured by the targeted browser suite. New structural layouts still require reviewed screenshot changes. This is a narrow initial fast lane, not permission to skip visual validation for colors, spacing, images or arbitrary button removal. No release-time SLA is claimed until measured.

After both `Application UI validation` and `Security and validation` succeed, a trusted default-branch `workflow_run` reclassifies the immutable base/head diff. Only the semantic `copy` lane can merge automatically. Forks, drafts, stale heads, requested changes, additions, deletions, mode changes, non-UI paths, and all structural/high-risk changes fail closed. The workflow then explicitly dispatches the isolated application-staging deployment because GitHub deliberately suppresses ordinary workflow triggers for events created by `GITHUB_TOKEN`. Production is never targeted.

Validated UI pull requests also receive an unpromoted Cloudflare Worker version preview with a `pr-<number>` alias. Trusted main tooling materializes only regular files under `static/` and `docs/ui/`; pull-request scripts and dependencies never execute with the staging token. The alias provides a remote visual URL without changing staging or production traffic.
