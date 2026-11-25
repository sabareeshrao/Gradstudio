# Database migration policy

`worker/schema.sql` is the canonical empty-database schema for new isolated environments. It contains no production data or legacy educational content.

The dated SQL files in this directory are retained as historical evidence of changes that may already have been applied to the existing database. They predate a migration ledger, include overlapping alternatives, and must **not** be replayed blindly against production or a fresh database.

Before production schema work:

1. obtain an authorized, read-only inventory of the deployed schema and D1 migration ledger;
2. compare it with `schema.sql` without exporting customer rows;
3. create one idempotent forward migration for the verified starting state;
4. test that migration on an isolated structural snapshot and a fresh database;
5. record the migration name, source commit, backup/rollback plan, and test output;
6. apply through a protected deployment job only after explicit approval for the sensitive change.

Runtime HTTP migration/setup routes are disabled. Schema changes belong in reviewed SQL migrations and Cloudflare deployment tooling, never in normal requests.
