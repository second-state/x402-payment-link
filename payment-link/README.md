# x402-payment-link (merchant API, TypeScript)

Plan for a Next.js (API + UI) merchant service that serves product/link data to `x402-mvp`, removing hardcoded YAML/files. Auth is Google-only; no in-memory state (Fly.io friendly).

## Stack
- Runtime: Node.js 20+, pnpm.
- Framework: Next.js (App Router) with API routes; Zod for validation; optional Swagger via zod-openapi.
- Auth: NextAuth.js with JWT strategy (no in-memory sessions). Google provider only. Users/accounts stored in Postgres via Prisma adapter. API keys for service-to-service calls (admin only).
- DB/ORM: Prisma targeting Supabase Postgres (local dev uses the same schema).
- Tooling: ESLint, Prettier, Vitest + Supertest for API tests.

## Data model (initial)
- `users`: id, email, role (`merchant|admin`), password hash (if credentials), createdAt.
- `accounts` / `verificationTokens`: for OAuth/email flows (NextAuth tables).
- `apiKeys`: id, userId, name, hashedKey, createdAt, revokedAt (for `x402-mvp` or CLI).
- `products`: id (uuid), slug, name, description, image, active.
- `prices`: id, productId, amount, shipping, currency, active.
- `links`: id (short code), network (`base|base-sepolia|base-mainnet`), payToAddress, successUrl, cancelUrl, priceOverride, shippingOverride, createdAt; `linkProducts` join links to one or many products.
- (Later) `orders`, `payments`, `auditLogs`.

## API surface (v0)
- Auth (NextAuth routes + middleware): JWT sessions; Prisma adapter to Postgres; Google provider.
- `GET /api/health` → `{status:"ok"}`
- Products (auth, user scoped): `GET /api/products`, `POST /api/products`, `GET /api/products/:slug`, `PUT /api/products/:slug`.
- Links (auth, user scoped): `GET /api/links`, `POST /api/links` body `{productSlug, network, payToAddress, successUrl?, cancelUrl?, priceOverride?, shippingOverride?}`, `GET /api/links/:code` (auth) → link + product/price snapshot.
- API keys (admin only): `GET /api/api-keys`, `POST /api/api-keys`, `POST /api/api-keys/:id/revoke`.

## Auth notes
- Use `session.strategy = "jwt"`; set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Store users/accounts/tokens in Postgres via Prisma adapter; no in-memory cache.
- Google provider only; add `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
- API keys: hashed, admin-only; protected endpoints for create/revoke/list.

## Integration notes for `x402-mvp`
- Replace YAML lookup with `GET /api/products/:slug` when rendering product pages.
- Build PaymentRequirements from `GET /api/links/:code` (includes price, shipping, network, payTo).
- Single set of prices per product (no environments).

## Configuration
- `.env` keys (examples): `DATABASE_URL`/`DIRECT_URL` (Supabase connection strings, SSL), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `DEFAULT_NETWORK`, `DEFAULT_PAY_TO_ADDRESS`.

## Deployment
1) Provision Supabase Postgres (or another Postgres) and note the connection strings.
2) Set environment variables in your hosting provider:
   - `DATABASE_URL` and `DIRECT_URL`
   - `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - `DEFAULT_NETWORK` and `DEFAULT_PAY_TO_ADDRESS`
3) Run Prisma migrations on the target DB:
   - `pnpm prisma migrate deploy`
4) Build and deploy the Next.js app:
   - `pnpm install`
   - `pnpm build`
   - `pnpm start`

## Next steps to implement
1) Scaffold Next.js TS app (`pnpm create next-app --ts`), add Prisma + NextAuth + Zod + testing deps.
2) Define Prisma schema (tables above) and run migrations against Supabase.
3) Implement NextAuth config (JWT strategy), middleware/guards to protect routes, API key model/check.
4) Implement API routes for products/links with Zod validation and typed responses.
5) Add vitest/supertest coverage for auth gating, product fetch, link creation/retrieval.
