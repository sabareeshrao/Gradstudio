# Application staging deployment

The application staging Worker is independent from both production and the
content staging Worker. It uses Cloudflare Workers Static Assets for the
checked-in `static/` directory and a service binding to
`gradstudio-content-staging`. It does not bind an R2 bucket and cannot read or
mutate the legacy educational catalog.

No workflow in this document deploys production. Production remains on its
existing configuration until a separately authorized cutover.

## Protected GitHub environment

Create or update the `staging` environment in `sabareeshrao/Gradstudio`. Limit
deployment branches to `main`. Configure this environment secret:

- `CLOUDFLARE_API_TOKEN`: an Account API token scoped to **Individual Workers
  Editor** for only `gradstudio-app-staging` in the `GradStudio
  Non-Production` account.

Configure these environment variables:

- `CLOUDFLARE_ACCOUNT_ID`: the non-production Cloudflare account ID.
- `CLOUDFLARE_STAGING_ENABLED`: keep `false` until the first staging deployment
  is explicitly authorized; change to `true` to enable validated deployments.
- `APP_STAGING_D1_DATABASE_ID`: isolated `gradstudio-app-staging` D1 UUID.
- `APP_STAGING_KV_ID`: isolated application KV namespace ID.
- `APP_STAGING_REFRESH_TOKENS_KV_ID`: isolated refresh-token namespace ID.
- `APP_STAGING_RATE_LIMITS_KV_ID`: isolated rate-limit namespace ID.
- `APPLICATION_STAGING_ORIGIN`: exact HTTPS origin for
  `gradstudio-app-staging` with no trailing slash.
- `CONTENT_STAGING_ORIGIN`: exact HTTPS origin for
  `gradstudio-content-staging` with no trailing slash.

The resource IDs are configuration identifiers, not credentials. The token is
the only Cloudflare credential used by this workflow. It needs no D1, KV, R2,
DNS, route, or production-account permission. The target Worker must already
exist because an Individual Workers Editor token cannot create arbitrary
Workers.

## Cloudflare Worker secrets

Before enabling deployment, configure distinct high-entropy values directly on
the existing `gradstudio-app-staging` Worker for `JWT_SECRET` and
`JWT_REFRESH_SECRET`. Configure any OAuth credentials only if staging OAuth is
being tested. Never copy production secrets into staging and never commit these
values or place them in workflow variables.

The deployment workflow does not create, print, rotate, or delete Worker
secrets. Wrangler preserves the existing secrets when publishing a new Worker
version.

## Deployment behavior

`.github/workflows/application-staging.yml` always validates the UI, Worker,
environment isolation, and a Static Assets dry run. Its credentialed job runs
only when the protected environment variable is exactly `true`. Before
deployment it verifies the independent content staging catalog. After
deployment it verifies:

- the application health endpoint reports the immutable Git commit;
- the content source is `git`;
- the application shell is served from Static Assets;
- the legacy educational catalog returns `404`;
- legacy educational editor pages redirect to the read-only Git release status;
- the independent content adapter reports `ready`.

If this post-deployment smoke verification fails, the serialized workflow uses
Wrangler's non-interactive rollback to restore the version deployed immediately
before the failed release, verifies that the restored Worker is healthy, and
still fails the workflow so the rejected release cannot be reported as staged.
The automatic rollback does not alter D1 or KV data.

Routine validated commits to `main` can deploy automatically after the initial
staging authorization. UI and content workflows remain independent.

## Rollback

Use `.github/workflows/application-staging-rollback.yml` with the exact target
Cloudflare Worker version ID. The workflow can affect only
`gradstudio-app-staging`, creates a new deployment pointing 100% at the selected
version, and then verifies the restored app. Cloudflare Worker versions include
the Worker code, bindings, configuration, and Static Assets manifest; D1 and KV
data are not rolled back.

Keep compatible asset filenames across adjacent releases where practical,
because a browser page already open during deployment or rollback may request
files from the other version.

## Local evidence

```powershell
npm ci
npm run ui:validate
Set-Location worker
npm ci
npm run validate
npx wrangler deploy --config wrangler.staging.toml --dry-run
```

Materialize `worker/wrangler.staging.toml` only from isolated non-production
values using `node scripts/materialize-staging-config.mjs`. The generated file
is ignored by Git.

Cloudflare references:

- <https://developers.cloudflare.com/workers/static-assets/binding/>
- <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>
- <https://developers.cloudflare.com/workers/authorization/workers/>
