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
DATABASE_URL=postgres://earnwave:earnwave_dev_password@localhost:5432/earnwave
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
- User: `earnwave`
- Password: `earnwave_dev_password`

Hosted Postgres works too. Paste its connection string into `backend/.env` as `DATABASE_URL`, then run the same `db:check` and `migrate` commands.

## Cloud Checklist

1. Create managed PostgreSQL and Redis instances.
2. Set every variable from `.env.example` in the cloud host.
3. Set the production domain variables:

```bash
CLIENT_URL=https://getearnwave.com
PUBLIC_URL=https://getearnwave.com
NODE_ENV=production
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

All withdrawal requests enter manual review first. Admin approval triggers provider dispatch:

- PayPal withdrawals use PayPal Payouts.
- Gift card withdrawals use Tremendous reward orders.
- Crypto withdrawals use Circle stablecoin transfers when Circle credentials are configured.

The payout queue is available at `/api/admin/payouts`. Admins approve with `/api/admin/payouts/{id}/approve` or reject with `/api/admin/payouts/{id}/reject`.

If provider credentials are missing, approving a withdrawal marks it `approved` but does not send money. Once credentials are configured, approvals can dispatch automatically.

## Provider Notes

Stripe uses Checkout Sessions because Stripe recommends Checkout Sessions for most built-in checkout integrations.
PayPal uses server-side Orders v2 calls so the browser never receives API credentials.
Offerwalls require real partner accounts and callback signatures before production crediting should be enabled.

## Offerwall Callback URLs

Configure these URLs in each publisher dashboard after deployment:

- CPX Research: `https://getearnwave.com/api/offerwalls/cpx/callback`
- AdGate: `https://getearnwave.com/api/offerwalls/adgate/callback`
- BitLabs: `https://getearnwave.com/api/offerwalls/bitlabs/callback`
- Lootably: `https://getearnwave.com/api/offerwalls/lootably/callback`
- TimeWall: `https://getearnwave.com/api/offerwalls/timewall/callback`
- Ayet Studios: `https://getearnwave.com/api/offerwalls/ayet/callback`

Most providers send callbacks as GET requests with query parameters; the backend accepts both GET and POST. Lootably expects a plain `1` response body for successful postbacks, which this backend returns.

The frontend opens each provider through `/api/offerwalls/{provider}/launch`, which builds the provider URL with the logged-in EarnWave user ID.

## Domain Setup

For `getearnwave.com`, point DNS to the cloud host after deployment:

- Root/apex domain: use the host's A records or ALIAS/ANAME record if provided.
- `www`: use a CNAME to the host target.
- Enable HTTPS/SSL in the cloud host.
- Redirect `www.getearnwave.com` to `getearnwave.com` or the other way around, but choose one canonical version.
- After DNS resolves, check `https://getearnwave.com/api/health`.
