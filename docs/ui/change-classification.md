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
