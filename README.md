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
