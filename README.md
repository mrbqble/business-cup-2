# business-cup-2

Built during the Zimran x AIESEC Business Cup 2.0 (24 h, web, B2C, for working adults in the US).

## What it is and for whom

TODO: problem, target user, what they pay for.

## Live

TODO: production URL.

## How it works

TODO: architecture once the product is in.

- `src/app`: routes. `GET /api/health` reports the deployed commit and dependency config (used by the smoke check and the uptime monitor).
- `src/lib/ai`: server-only AI client. Tries providers in the order given by `AI_PROVIDERS`, with a per-call timeout and fallback to the next provider on timeout, 429, 5xx or network errors.
- `src/lib/rate-limit`: per-IP sliding-window limiter for AI routes (in memory, best effort on serverless).

## Stack

Next.js (App Router), TypeScript (strict), Tailwind CSS, Vitest. Hosted on Vercel; `main` is production, every other branch gets a preview deployment. CI runs `npm run check` on every push and pull request.

## Run locally

Requires Node 24 (`nvm use` reads `.nvmrc`).

```sh
npm ci
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run check      # lint, typecheck, test, build
```

Smoke-check a deployment: `scripts/smoke.sh <base-url> [expected-commit-sha]`.

## Environment variables

See `.env.example`.

| Name | Purpose |
|---|---|
| `AI_PROVIDERS` | Ordered, comma-separated provider names. Only `mock` exists so far. |

## AI usage and fallback

TODO: where AI is used, which providers, and what happens when they fail.

## Known limitations

TODO.
