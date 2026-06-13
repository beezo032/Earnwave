# EarnWave Deployment

EarnWave is now structured for a cloud deployment with:

- React/Vite frontend built into `dist/`
- Express API in `backend/src`
- PostgreSQL via `DATABASE_URL`
- Redis via `REDIS_URL`
- Stripe Checkout and PayPal Orders APIs behind environment keys
- Offerwall postback endpoints under `/api/offerwalls/:provider/callback`

## Local Services

If PostgreSQL is already installed locally, create a database/user and set:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/earnwave
```

Then run:

```bash
copy .env.example backend/.env
npm install
npm --prefix backend install
npm --prefix backend run db:check
npm --prefix backend run migrate
npm --prefix backend run bootstrap:admin
npm run build
npm start
```

If PostgreSQL is not installed, install PostgreSQL 17, then create:

- Database: `earnwave`
- User: your local database user
- Password: your local database password

Hosted Postgres works too. Paste its connection string into `backend/.env` as `DATABASE_URL`, then run the same `db:check` and `migrate` commands.

## Cloud Checklist

### Option A: Render Blueprint

The repo includes `render.yaml`, which can create:

- EarnWave web service
- Render Postgres database
- Render Key Value instance for Redis-compatible sessions/cache
- Generated `JWT_SECRET` and `SESSION_SECRET`
- `DATABASE_URL` and `REDIS_URL` wired automatically
- `getearnwave.com` and `www.getearnwave.com` custom domain entries
- Startup migrations, with admin bootstrap when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured

In Render:

1. Go to **New > Blueprint**.
2. Connect `beezo032/Earnwave`.
3. Select `render.yaml`.
4. Enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` when prompted. If you skip them, deployment still works, but no admin user is created until those env vars are added and the service is redeployed.
5. Create the Blueprint.
6. After the service is created, open the custom domain settings and copy Render's DNS targets into Namecheap.

### Option B: Manual Services

1. Create managed PostgreSQL and Redis/Key Value instances.
2. Set every variable from `.env.example` in the web service.
3. Set the production domain variables:

```bash
CLIENT_URL=https://getearnwave.com
PUBLIC_URL=https://getearnwave.com
NODE_ENV=production
MANUAL_PAYOUTS_ENABLED=true
```

4. Run `npm --prefix backend run migrate` once against the production database.
5. Run `npm --prefix backend run bootstrap:admin` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
6. Build the frontend with `npm run build`.
7. Start the server with `npm start`.
8. Configure Stripe and PayPal webhooks to the public backend URL.
9. Configure offerwall provider postbacks to `/api/offerwalls/{provider}/callback`.
10. Put the app behind HTTPS and enable secure cookies in production.

Check `/api/health` after deployment. It includes a `readiness.remaining` array with missing launch items.

## Payout Automation

All withdrawal requests enter manual review first. For launch, set `MANUAL_PAYOUTS_ENABLED=true` and send approved PayPal Business or Tremendous payouts manually. Admin approval records the reviewed payout so you can reconcile it.

When automated provider credentials are added, admin approval can trigger provider dispatch:

- PayPal withdrawals use PayPal Payouts.
- Gift card withdrawals use Tremendous reward orders.
- Crypto withdrawals use Circle stablecoin transfers when Circle credentials are configured.

The payout queue is available at `/api/admin/payouts`. Admins approve with `/api/admin/payouts/{id}/approve` or reject with `/api/admin/payouts/{id}/reject`.

If provider credentials are missing and manual payout mode is enabled, approving a withdrawal marks it `approved` for manual payment. Send the PayPal or Tremendous payout outside EarnWave, then keep the admin record for reconciliation.

### Tremendous Gift Cards

To enable gift card payouts, add these Render environment variables from your Tremendous dashboard:

```bash
TREMENDOUS_API_KEY=your-tremendous-api-key
TREMENDOUS_ENV=testflight
TREMENDOUS_FUNDING_SOURCE_ID=your-funding-source-id
TREMENDOUS_PRODUCT_ID=your-gift-card-product-id
```

Use `TREMENDOUS_ENV=testflight` while testing. Switch to `TREMENDOUS_ENV=production` only after your Tremendous funding source and product are approved for live orders.

EarnWave sends Tremendous orders only after an admin manually approves a withdrawal. Gift card requests use the user's payout email as the Tremendous recipient email and the withdrawal ID as the idempotency key.

## Provider Notes

Stripe uses Checkout Sessions because Stripe recommends Checkout Sessions for most built-in checkout integrations.
PayPal uses server-side Orders v2 calls so the browser never receives API credentials.
Offerwalls require real partner accounts and verified callbacks before production crediting should be enabled. CPX and TheoremReach pay EarnWave as the publisher; EarnWave credits the user only after the provider calls the backend callback endpoint.

## Offerwall Callback URLs

### CPX Research

In CPX Research, open **Postback Settings** and use this URL:

```text
https://getearnwave.com/api/offerwalls/cpx/callback?user_id={user_id}&trans_id={trans_id}&amount_local={amount_local}&amount_usd={amount_usd}&status={status}&postback_secret=YOUR_CPX_POSTBACK_SECRET
```

Set this Render environment variable to the same random value:

```text
CPX_POSTBACK_SECRET=YOUR_CPX_POSTBACK_SECRET
```

Required CPX fields:

- `user_id={user_id}` identifies the EarnWave user.
- `trans_id={trans_id}` prevents duplicate credits.
- `amount_local={amount_local}` and `amount_usd={amount_usd}` tell EarnWave how many WaveCoins to calculate.
- `status={status}` lets EarnWave credit completed transactions and reverse cancelled transactions.
- `postback_secret=...` lets EarnWave verify the callback without disabling fraud protection.

Do not set `ALLOW_UNVERIFIED_OFFERWALL_CALLBACKS=true` in production.

### TheoremReach

Use the deployed callback endpoint:

```text
https://getearnwave.com/api/offerwalls/theorem/callback
```

TheoremReach callbacks are verified with `THEOREM_SECRET_KEY`.

The frontend opens each provider through `/api/offerwalls/{provider}/launch`, which builds the provider URL with the logged-in EarnWave user ID.

## Domain Setup

For `getearnwave.com`, point DNS to the cloud host after deployment:

- Root/apex domain: use the host's A records or ALIAS/ANAME record if provided.
- `www`: use a CNAME to the host target.
- Enable HTTPS/SSL in the cloud host.
- Redirect `www.getearnwave.com` to `getearnwave.com` or the other way around, but choose one canonical version.
- After DNS resolves, check `https://getearnwave.com/api/health`.
