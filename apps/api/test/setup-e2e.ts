/**
 * Defaults for the e2e run. `DATABASE_URL` is intentionally not defaulted — the
 * suite writes real rows, so it must point at a database the caller chose
 * (CI service container, or the local `pnpm db:up` instance via `apps/api/.env`).
 */
process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'e2e-only-secret-at-least-32-characters-long';
