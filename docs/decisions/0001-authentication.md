# 1. Authentication

- **Status:** Accepted
- **Date:** 2026-08-11
- **Context:** [Authentication plan](../plans/authentication.md), Phases 3–4

Four decisions were made while building the auth layer. They are recorded together
because each one constrains the others, and all four are revisited by **Restaurant
management** — the first feature that introduces tenants.

---

## 1. Access tokens travel in the `Authorization` header, not an httpOnly cookie

### Context

The admin app is a separate origin from the API in development (`localhost:5173`
against `localhost:4000`, proxied through Vite). Both a Bearer header and a cookie
were viable: `main.ts` already enables CORS with `credentials: true`, so the cookie
path was never closed off.

### Decision

The API returns a signed JWT in the response body (`AuthTokens.accessToken`), and
clients send it back as `Authorization: Bearer <token>`. The admin app stores it in
`localStorage` (`apps/admin/src/lib/token-storage.ts`).

### Consequences

- **The token is reachable from JavaScript, so an XSS bug is a session compromise.**
  This is the real cost of the decision. It is accepted for v1 because the admin app
  renders no user-supplied HTML yet; that assumption needs re-checking when menus,
  restaurant profiles, and uploaded content arrive.
- A page refresh keeps the session without a refresh-token round trip.
- No CSRF surface — the browser never attaches the credential automatically.
- Non-browser clients (the future kitchen/waiter apps, QR ordering, integration
  tests) authenticate the same way as the admin app, with no cookie handling.
- Moving to httpOnly cookies later is contained: the API sets the cookie on
  login/register, the guard reads it, and the admin drops `token-storage.ts` in
  favour of credentialed requests. Nothing else in the codebase reads the token.

### Alternatives considered

**httpOnly + Secure + SameSite cookie.** Immune to token theft via XSS, which is the
threat that matters most for a dashboard holding restaurant data. Rejected for v1
only because it adds CSRF protection, cookie-domain configuration, and credentialed
CORS to a milestone whose goal was a working login. It remains the recommended
destination once the admin app renders untrusted content.

---

## 2. Roles are a fixed enum, and v1 signup always creates an `owner`

### Context

The roadmap needs at minimum an owner who configures a restaurant and staff who work
in it. Kitchen and waiter dashboards will need finer distinctions later.

### Decision

`UserRole` is a Postgres enum — `owner | manager | staff` — declared in
`prisma/schema.prisma` and mirrored as a union type in `@altora/types` so both apps
share one definition. `POST /auth/register` hardcodes `owner`; the DTO does not
accept a role, so the endpoint cannot be used to self-assign privileges.

**Roles are read from the database on every request, never from the token.**
`JwtStrategy.validate` re-loads the user by `sub` and maps the row fresh, so the
`role` claim inside the JWT is informational only.

### Consequences

- Role changes and account deletions take effect immediately rather than at token
  expiry — the reason revocation is tolerable without a denylist (see decision 4).
- Every authenticated request costs one indexed primary-key lookup. Acceptable now;
  a cache is the fix if it ever shows up in traces.
- `manager` and `staff` exist in the schema but are unreachable — no endpoint issues
  them yet. Invites in **Restaurant management** will.
- Adding a role means a migration plus a `@altora/types` change. The comment in
  `packages/types/src/auth.ts` flags the pairing; nothing enforces it mechanically.
- There is no `@Roles()` decorator yet. Authorization today is binary:
  authenticated or not.

---

## 3. Users are global; multi-tenancy is deferred

### Context

Altora is a multi-tenant product — a user belongs to a restaurant, and almost every
future query is scoped by it. Auth had to ship before any restaurant entity existed.

### Decision

The `users` table has no tenant column and no membership join. An account is a
standalone identity with a role that is not yet scoped to anything. Email is unique
**globally** (lowercased on write and read via `normalizeEmail`, so logins are
case-insensitive).

### Consequences

- **The global email uniqueness constraint is the load-bearing assumption here.** If
  a person ever needs to work at two restaurants under one email, this becomes a
  migration on the auth table, not just an additive one. A `restaurant_members` join
  table (user × restaurant × role) keeps `users` untouched and is the expected shape.
- `AuthUser.role` will need to become per-restaurant rather than per-user, which
  changes a contract both apps already consume.
- Until then, nothing is scoped: any authenticated user reaching a future
  restaurant endpoint would see every restaurant. Restaurant-scoped guards must land
  in the same milestone as the first restaurant endpoint, not after it.

---

## 4. Logout is client-side; there is no server-side invalidation

### Context

Stateless JWTs cannot be withdrawn once issued. Revoking one requires either
server-side session state or a short-lived access token plus a refresh token.

### Decision

No `POST /auth/logout` endpoint. Logging out means the client discards the token.
Tokens are signed with `HS256` and expire after `JWT_EXPIRES_IN` (default `1d`).

### Consequences

- **A stolen token stays valid until it expires — up to 24 hours.** Nothing shortens
  that window today.
- Deleting or demoting a user _does_ take effect immediately, because the strategy
  re-reads the row per request (decision 2). So the gap is narrower than full
  statelessness would imply: it covers stolen tokens, not revoked accounts.
- Rotating `JWT_SECRET` invalidates every token at once — the only blunt instrument
  available.
- Proper revocation needs a denylist keyed by token ID in Redis, plus short access
  tokens and refresh tokens. Redis is already in the stack plan and in
  `.env.example`, but is deliberately not wired up yet.
- Reducing `JWT_EXPIRES_IN` is the cheap partial mitigation, at the cost of making
  users log in more often while there is no refresh flow.

---

## Related implementation notes

Not decisions in themselves, but deliberate and worth not undoing by accident:

- **bcrypt at 12 rounds** hashes passwords (`SALT_ROUNDS` in `auth.service.ts`).
- **Login compares against a dummy hash when no account matches**, so a wrong email
  and a wrong password take the same time and cannot be told apart by an attacker
  enumerating addresses. Both paths also return the identical `Invalid credentials`
  message — asserted in the e2e suite.
- **Passwords are capped at 72 characters** because bcrypt silently ignores bytes
  past 72; the DTO rejects longer input rather than accepting a truncated password.
- **The JWT guard is global** (`APP_GUARD` in `app.module.ts`), so new routes are
  protected by default and must opt out with `@Public()`. Only `/auth/login`,
  `/auth/register`, and `/health` do.
