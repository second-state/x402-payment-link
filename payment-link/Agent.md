# Agent guide for x402-payment-link service

Build a new TypeScript Next.js service (API-first, future UI ready). Keep `x402-mvp` untouched; expose REST endpoints for products/links. Auth is required first; avoid any in-memory state (Fly.io friendly).

## Constraints
- Name: `x402-payment-link`.
- Stack: Next.js (App Router) + TypeScript + Zod, pnpm.
- Auth: NextAuth.js (JWT strategy, no in-memory sessions). Users/accounts via Prisma adapter to Supabase Postgres. Add API keys (hashed) for service-to-service access.
- DB: Prisma targeting Supabase Postgres (use same schema locally).
- No coupling to `x402-mvp` beyond REST.

## Must-haves (v0)
- Data: products, prices, links (short codes), API keys.
- Auth: Google OAuth via NextAuth (JWT sessions); server/API routes enforce auth; API keys are admin-only and stored hashed.
- Endpoints:
  - `GET /api/health`
  - `GET /api/products` (auth, scoped to user)
  - `POST /api/products` (auth, scoped to user)
  - `GET /api/products/:slug` (auth)
  - `PUT /api/products/:slug` (auth)
  - `GET /api/links` (auth, scoped to user)
  - `POST /api/links` (auth) body `{productSlug, network, payToAddress, successUrl?, cancelUrl?, priceOverride?, shippingOverride?}`
  - `GET /api/links/:code` (auth) returns link + product/price snapshot for checkout.
  - `GET /api/api-keys` / `POST /api/api-keys` (admin only)
  - `POST /api/api-keys/:id/revoke` (admin only)
- Seed existing `x402-mvp/products.yaml` into Postgres.
- Config via `.env`: `DATABASE_URL`/`DIRECT_URL` (Supabase, SSL), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `DEFAULT_NETWORK`, `DEFAULT_PAY_TO_ADDRESS`.

## Implementation outline
1) Scaffold Next.js TS app (`pnpm create next-app --ts`); add Prisma, NextAuth, Zod, ESLint/Prettier, Vitest+Supertest.
2) Prisma schema: Users, Accounts, VerificationTokens (NextAuth), ApiKeys, Products, Prices, Links. Keep default NextAuth account/user fields (emailVerified, hashedPassword nullable).
3) Seed script: import `x402-mvp/products.yaml` into Products/Prices.
4) NextAuth config: Google provider only, JWT sessions, Prisma adapter; set secrets. No in-memory caches.
5) Middleware/layout guards: protect app pages client-side; APIs enforce auth and user scoping.
6) API routes: Zod validation, consistent errors; products scoped to user; links scoped to user; API keys admin-only and hashed.
7) UI: shadcn/Tailwind dashboard with pages for products (list/create/edit), links (list/create), auth (Google), API keys hidden unless admin.

## Integration notes for later work
- `x402-mvp` should call `GET /api/products/:slug` and `GET /api/links/:code` instead of reading YAML.
- Build PaymentRequirements from the link snapshot (price, shipping, network, payToAddress).
- Single set of prices per product (no environment).

## Out of scope (future)
- Webhooks, payments/settlement storage, rate limiting, analytics, email notifications (beyond auth emails).
