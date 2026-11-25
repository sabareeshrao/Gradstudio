# GradStudio

GradStudio is a learning platform with a static web frontend, an admin interface and a Cloudflare Workers API.

This is a cleaned source snapshot migrated from https://github.com/sabs-27/gradstudio_upgrade on 2026-10-25.

## Layout

- static/ - website pages, JavaScript, CSS, images
- admin-preview/ - administration interface preview
- worker/src/ - Cloudflare Worker API and middleware
- worker/migrations/ - database migrations
- worker/schema.sql - database schema
- scripts/ - upload and synchronization utilities
- deploy-dev.sh, deploy-dev.ps1, deploy-prod.sh - deployment helpers

## Development

Install Node.js LTS and Cloudflare Wrangler. In worker/, run npm ci and npm test.
Review worker/wrangler.toml and configure secrets through Cloudflare before deploying.

## Repository governance

Read [AGENTS.md](AGENTS.md) before making changes. It defines this repository's
role in the approved three-repository GradStudio 2.0 architecture, validation
expectations and production safeguards.

- UI component ownership and exact selectors: [docs/ui/component-inventory.md](docs/ui/component-inventory.md)
- Prompt-driven UI configuration contract: [docs/ui/configuration-contract.md](docs/ui/configuration-contract.md)
- Founder prompt-operation playbook: [docs/ui/prompt-operation-playbook.md](docs/ui/prompt-operation-playbook.md)
- GradStudio 2.0 content integration boundary: [docs/content-catalog-integration.md](docs/content-catalog-integration.md)
- Public security-readiness notice: [docs/security/README.md](docs/security/README.md)
- Detailed source security baseline: private `sabareeshrao/Gradstudio-2.0-Admin/docs/security/2026-11-24-baseline-audit.md`
- New public educational content: https://github.com/sabareeshrao/Gradstudio-2.0
- Private requirements and implementation tracking: `sabareeshrao/Gradstudio-2.0-Admin`

GitHub is the source of truth for product code, UI design and new educational
content. Customer accounts, progress, payments, credentials and other
operational data remain in secured runtime systems. New educational content is
created fresh in `Gradstudio-2.0`; legacy educational content is not migrated.

No production deployment is implied by a source change. The existing
Cloudflare environment must be isolated and the security baseline remediated
before routine automatic deployment is enabled.

## Safety warning

The imported Wrangler configuration still references the original live domain,
D1 database, KV namespaces and R2 bucket. Its development and production
environments reference the SAME persistent resources. Isolate development
resources and review settings before deploying or modifying live data.
Do not commit JWT signing secrets or other credentials.

## Cleanup and traceability

Temporary logs, data dumps, generated deployment previews, experimental
standalone HTML notes and test results were excluded. Encoded image assets
were repaired and an unsafe TLS certificate-verification bypass was removed.

Original: https://github.com/sabs-27/gradstudio_upgrade
Previous destination scaffold: https://github.com/sabareeshrao/Gradstudio/tree/backup/pre-migration-2026-10-25
Original history remains in the original repo. This is a cleaned code migration,
not a replay of historical commits.

