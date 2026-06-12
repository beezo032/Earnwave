# EarnWave Architecture

EarnWave is split into a Vite React frontend and an Express API backend.

## Frontend

- `src/main.jsx` contains the current route-level React application.
- `src/earnCards.jsx` contains reusable earn-dashboard cards and analytics events.
- `src/styles.css` contains the current design system and page styles.
- `public/` stores static brand assets served by Vite.

As the frontend grows, prefer extracting new route surfaces into focused files under `src/pages/` and reusable UI into `src/components/`.

## Backend

- `backend/server.js` starts the API, runs production migrations, connects Redis, and bootstraps admin when configured.
- `backend/src/app.js` wires Express middleware, security headers, API routes, static assets, and SPA fallbacks.
- `backend/src/routes/` contains HTTP contracts.
- `backend/src/services/` contains business logic for wallets, offerwalls, fraud, growth, compliance, email, payouts, and users.
- `backend/src/db/` contains PostgreSQL schema, migrations, demo store fallback, and connection helpers.
- `backend/test/` contains Node test runner API/service tests.

## Data Flow

1. Users authenticate through `/api/auth`.
2. Protected frontend requests include JWT authorization and device hash metadata.
3. Offerwalls launch through `/api/offerwalls/:provider/launch`.
4. Provider callbacks enter `/api/offerwalls/:provider/callback`.
5. Credits and withdrawals flow through ledger and wallet services.
6. Admin review gates payouts before provider dispatch.

## Deployment

Render uses `render.yaml` to provision the web service, PostgreSQL, and Redis-compatible key-value service. In production, the backend runs migrations on startup before listening.

## Quality Gates

Run these before pushing:

```bash
npm run test:all
npm run build
```

GitHub Actions runs the same checks on pushes and pull requests to `main`.
