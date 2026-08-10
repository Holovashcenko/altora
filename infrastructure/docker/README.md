# Docker

Container definitions and Compose stacks for Altora.

## Local development

Start PostgreSQL:

```bash
pnpm db:up
```

Copy `apps/api/.env.example` to `apps/api/.env` if you have not already, then run migrations:

```bash
pnpm db:migrate
```

Stop PostgreSQL:

```bash
pnpm db:down
```

## Contents

- `docker-compose.yml` — local dev stack (PostgreSQL; Redis, Kafka, MinIO added later)
- `Dockerfile.api` — production image for `apps/api` (planned)
- `Dockerfile.admin` — production image for `apps/admin` (planned)
