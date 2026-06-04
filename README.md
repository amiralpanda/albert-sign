# albert-sign

Public contract e-signature for Atome design partnerships — **sign.atome.software**.

Separate from [amiralpanda/Albert](https://github.com/amiralpanda/Albert) (consulting / MCP).

## Deploy (Vercel + GitHub)

1. Import this repo on Vercel → new project **albert-sign**
2. **Root Directory**: empty (repo root)
3. Connect domain **sign.atome.software**
4. Env: `ATOME_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `SIGNING_PUBLIC_BASE_URL`

Every push to `main` deploys automatically.

## Albert monorepo

Albert admin creates invitations by calling:

`POST https://sign.atome.software/api/signing/requests`

(Configure `SIGNING_API_BASE_URL` in Albert when wiring prod.)

## Local dev

```bash
pnpm install
cp .env.example .env
pnpm dev
# Web http://localhost:5173 — API http://localhost:4002
```
