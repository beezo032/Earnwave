# Security Policy

EarnWave is intended to be safe for a public GitHub repository, but real credentials must never be committed.

## Keep Secret Values Out of Git

Store production secrets in Render environment variables, GitHub Actions secrets, or your local untracked `backend/.env` file.

Do not commit:

- Database URLs
- Redis URLs
- API keys
- OAuth client secrets
- Webhook signing secrets
- Admin passwords
- Payout provider credentials
- Offerwall secure hash secrets

Use `.env.example` only as a placeholder template. Every value in that file should stay fake.

## If a Secret Is Exposed

If a secret is accidentally committed or pasted somewhere public:

1. Rotate the secret in the provider dashboard immediately.
2. Update the value in Render or your local `.env`.
3. Re-deploy the app.
4. Remove the secret from Git history before making the repository public.

## Reporting Security Issues

For now, report security issues through the repository owner or the configured EarnWave support contact. Do not open public GitHub issues containing private exploit details, credentials, or user data.
