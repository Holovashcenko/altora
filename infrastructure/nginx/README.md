# nginx

Reverse-proxy and static-hosting configuration for deployed environments.

In production nginx serves the built `apps/admin` bundle and forwards `/api`
to `apps/api`. In development that routing is handled by the Vite dev-server
proxy in `apps/admin/vite.config.ts` instead, so nothing here is required to
run the stack locally.
