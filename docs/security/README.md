# Security readiness

GradStudio is undergoing a security and environment-isolation remediation phase. Do not use the current source as authorization for unattended production administration or deployment.

The detailed 2026-11-24 source audit is intentionally retained in the private `sabareeshrao/Gradstudio-2.0-Admin` repository at `docs/security/2026-11-24-baseline-audit.md`. It contains sensitive evidence and remediation gates that should not be copied into this public repository.

Before backend, authentication, admin, data, deployment, or Cloudflare work:

1. read the private audit and master implementation tracker;
2. isolate development and staging from production;
3. verify server-side authorization and least-privilege credentials;
4. add the required negative/security tests;
5. obtain explicit founder authorization before any production resource change.

Report new security findings privately. Public documentation should describe safe operating requirements without disclosing exploitable implementation details.


