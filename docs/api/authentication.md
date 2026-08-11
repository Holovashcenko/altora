# Authentication API

Three endpoints, implemented in `apps/api/src/auth/`, plus the deliberate absence of a
fourth — logout is client-side, documented at the end. Request and response shapes
come from `@altora/types`, so the admin app and the API share one definition.

Design rationale — Bearer tokens over cookies, the role model, tenant scope, and the
absence of a logout endpoint — is recorded in
[ADR 0001](../decisions/0001-authentication.md).

## Conventions

- **Base path:** every route is prefixed with `/api` (`app.setGlobalPrefix`), so the
  controller's `auth` routes are served at `/api/auth/*`. In development the admin
  dev server proxies `/api` to `http://localhost:4000`.
- **Authentication:** send the access token as `Authorization: Bearer <token>`.
- **Protected by default:** a global `JwtAuthGuard` covers every route. Only
  `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/health` are
  public.
- **Content type:** `application/json` for all request bodies.
- **Validation:** a global `ValidationPipe` runs with `whitelist: true`, so unknown
  properties are stripped from request bodies rather than rejected.

### Token

Signed `HS256` with `JWT_SECRET`, expiring after `JWT_EXPIRES_IN` (default `1d`).
Payload:

```json
{
  "sub": "cmsok7jtt0000pavhkgqtb2ha",
  "email": "owner@altora.test",
  "role": "owner",
  "iat": 1786446648,
  "exp": 1786533048
}
```

The `role` claim is informational. The API re-reads the user from the database on
every request, so the stored role — not the claim — decides what a request may do.

### Shared shapes

```ts
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'staff';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface AuthResponse {
  user: AuthUser;
  tokens: { accessToken: string };
}
```

`AuthUser` is the only user shape the API ever returns. The password hash is dropped
by `toAuthUser` and never leaves the server.

### Error shape

Errors use Nest's default exception body. `message` is a string, except for
validation failures where it is an array of messages — one per failed constraint.

```json
{ "message": "Invalid credentials", "error": "Unauthorized", "statusCode": 401 }
```

---

## `POST /api/auth/register`

Public. Creates an account and signs in immediately. v1 is open owner signup: every
account created here gets the `owner` role, and the role cannot be set by the caller.

**Request**

```json
{ "email": "owner@altora.test", "password": "correct-horse-battery", "name": "Owner" }
```

| Field      | Rules                                                    |
| ---------- | -------------------------------------------------------- |
| `email`    | Valid email address. Stored and matched lowercased.      |
| `password` | 8–72 characters. The upper bound is bcrypt's byte limit. |
| `name`     | 1–100 characters.                                        |

**`201 Created`**

```json
{
  "user": {
    "id": "cmsok7jtt0000pavhkgqtb2ha",
    "email": "owner@altora.test",
    "name": "Owner",
    "role": "owner",
    "createdAt": "2026-08-11T11:10:48.353Z",
    "updatedAt": "2026-08-11T11:10:48.353Z"
  },
  "tokens": { "accessToken": "eyJhbGciOiJIUzI1NiIs..." }
}
```

**Errors**

| Status | When                     | Body                                                                            |
| ------ | ------------------------ | ------------------------------------------------------------------------------- |
| `400`  | Validation failed        | `{"message":["email must be an email"],"error":"Bad Request","statusCode":400}` |
| `409`  | Email already registered | `{"message":"Email is already registered","error":"Conflict","statusCode":409}` |

---

## `POST /api/auth/login`

Public. Exchanges credentials for a token. Returns `200`, not `201` — the endpoint
creates no resource.

**Request**

```json
{ "email": "owner@altora.test", "password": "correct-horse-battery" }
```

**`200 OK`** — identical shape to register.

**Errors**

| Status | When                                    |
| ------ | --------------------------------------- |
| `400`  | Missing or malformed `email`/`password` |
| `401`  | Unknown email **or** wrong password     |

An unknown email and a wrong password return the same `Invalid credentials` message
and take the same time to answer, so the endpoint cannot be used to discover which
addresses have accounts. Do not split these into distinct messages.

Email matching is case-insensitive: `Owner@Altora.test` logs in as
`owner@altora.test`.

---

## `GET /api/auth/me`

Requires a token. Resolves it to the current user, re-read from the database rather
than decoded from the token — so a deleted account or a changed role is reflected
immediately.

**Request**

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**`200 OK`** — an `AuthUser`.

```json
{
  "id": "cmsok7jtt0000pavhkgqtb2ha",
  "email": "owner@altora.test",
  "name": "Owner",
  "role": "owner",
  "createdAt": "2026-08-11T11:10:48.353Z",
  "updatedAt": "2026-08-11T11:10:48.353Z"
}
```

**Errors**

| Status | When                                                                   |
| ------ | ---------------------------------------------------------------------- |
| `401`  | No token, malformed token, expired token, or the user no longer exists |

All four cases return `{"message":"Unauthorized","statusCode":401}` — the guard does
not distinguish them. The admin app treats any `401` as "session over" and redirects
to `/login`.

---

## Logout

**There is no logout endpoint.** Access tokens are stateless: clients log out by
discarding the token, and the token stays technically valid until it expires.

Deleting or demoting a user takes effect immediately regardless, because every
request re-reads the user. See [ADR 0001, decision 4](../decisions/0001-authentication.md#4-logout-is-client-side-there-is-no-server-side-invalidation)
for what server-side revocation would require.

---

## Trying it out

With the API running (`pnpm db:up && pnpm dev`):

```bash
# Register and capture the token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@altora.test","password":"correct-horse-battery","name":"Owner"}' \
  | node -p 'JSON.parse(require("fs").readFileSync(0)).tokens.accessToken')

# Use it
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN"

# Without it — 401
curl -s http://localhost:4000/api/auth/me
```

The e2e suite (`apps/api/test/auth.e2e-spec.ts`) exercises every response documented
here against a real database; run it with `pnpm test:e2e`.
