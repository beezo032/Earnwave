# EarnWave Backend

## Route Modules

- `src/routes/auth.js`: signup, login, logout, session/JWT identity
- `src/routes/offers.js`: public and authenticated offer feeds, completion tracking
- `src/routes/wallet.js`: withdrawal requests and history
- `src/routes/admin.js`: moderation queue and admin actions
- `src/routes/payments.js`: Stripe Checkout, PayPal Orders, Stripe webhook signature validation
- `src/routes/offerwalls.js`: provider list and postback callback normalization
- `src/routes/analytics.js`: admin analytics surface
- `src/routes/account.js`: profile, preferences, support tickets, email outbox
- `src/routes/compliance.js`: KYC/tax profile, consent records, payout eligibility
- `src/routes/growth.js`: referrals, streaks, quests, leaderboards, bonus codes
- `src/routes/legal.js`: public legal policy documents
- `src/routes/public.js`: public proof/read-only trust endpoints

## Data and Cache

- `src/db/schema.sql` defines PostgreSQL tables.
- `src/db/migrate.js` applies the schema and seed offers.
- `src/cache/redis.js` enables Redis-backed Express sessions and cache.
- Without `DATABASE_URL` or `REDIS_URL`, the app runs in demo mode for local UI development.

## Production Gaps To Close

- Replace demo analytics with SQL aggregation queries.
- Persist and reconcile provider postbacks after signature validation.
- Reconcile Stripe webhook events into account/payment records after signature validation.
- Add PayPal capture and webhook reconciliation.
- Run `npm run bootstrap:admin` after setting `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Payout Automation

Payouts are intentionally gated by manual approval:

1. User submits a withdrawal with method, amount, and destination.
2. Fraud scoring sets the withdrawal to `review` or `held`.
3. Admin reviews `/api/admin/payouts`.
4. Admin approval dispatches:
   - PayPal Payouts for `PayPal`
   - Tremendous reward orders for `Gift Card`
   - Circle transfers for `Crypto`
5. Missing provider credentials keep the withdrawal approved but unsent.

Tremendous requires `TREMENDOUS_API_KEY`, `TREMENDOUS_FUNDING_SOURCE_ID`, and `TREMENDOUS_PRODUCT_ID`. Use `TREMENDOUS_ENV=testflight` for sandbox orders and `TREMENDOUS_ENV=production` for live gift cards.

## Offerwall Providers

The active production-facing provider list is:

- CPX Research
- TheoremReach

Each provider has:

- an enable check based on environment variables
- a launch URL builder
- callback normalization into `{ userId, transactionId, offerId, amount, status }`
- signature verification when the provider secret is configured

CPX Research postbacks should be configured with:

```text
https://getearnwave.com/api/offerwalls/cpx/callback?user_id={user_id}&trans_id={trans_id}&amount_local={amount_local}&amount_usd={amount_usd}&status={status}&postback_secret=YOUR_CPX_POSTBACK_SECRET
```

Set `CPX_POSTBACK_SECRET` in the runtime environment to the same value used in the URL. Production crediting should only happen after the provider callback verifies and duplicate transaction checks are persisted in PostgreSQL.
