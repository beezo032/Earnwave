# EarnWave

EarnWave is a premium rewards platform built with a React/Vite frontend and a structured Express backend. It includes PostgreSQL persistence, Redis-backed sessions/cache, admin moderation, offerwall adapters, payout-provider scaffolding, fraud review, referrals, leaderboards, support, legal pages, and account lifecycle flows.

## Structure

```txt
earnwave/
  backend/              Express API, routes, services, database schema
  public/               Static public assets
  src/                  React application
  index.html            Vite entry
  DEPLOYMENT.md         Deployment and domain setup notes
  docker-compose.yml    Optional local Postgres/Redis services
```

## Local Setup

```bash
npm install
npm --prefix backend install
npm --prefix backend run db:check
npm --prefix backend run migrate
npm --prefix backend run bootstrap:admin
npm run build
npm start
```

The backend reads environment variables from `backend/.env`. Use `.env.example` as the production-safe template and never commit real secrets.

## Health

After starting the app, check:

```txt
http://localhost:5000/api/health
```

For launch readiness, PostgreSQL, Redis, and admin bootstrap should be true. Offerwalls and payout providers require real partner credentials.

## Render Deployment

This repo includes `render.yaml` for Render Blueprint deployment. It creates the web service, Postgres, and Redis-compatible Key Value service, then runs migrations and admin bootstrap before starting the app.

In Render, choose **New > Blueprint**, connect this repo, select `render.yaml`, and provide `ADMIN_EMAIL` plus `ADMIN_PASSWORD` when prompted.

## Email Verification

Production email delivery supports Resend. Verify `getearnwave.com` in Resend, then add these Render env vars:

```bash
EMAIL_PROVIDER=resend
EMAIL_FROM=EarnWave <hello@getearnwave.com>
RESEND_API_KEY=re_your_key_here
```

Without those env vars, verification and reset messages are kept in the admin email outbox for local/demo review.
