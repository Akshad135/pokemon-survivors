# Accounts API

Small Node API behind the optional accounts: each signed-in player's save, synced across devices. Hono on Node 24, Postgres through [`postgres`](https://github.com/porsager/postgres), Clerk session tokens checked with `@clerk/backend`.

The merge rules are not here: `mergeSaves` and `applyPush` live in `src/game/sync.ts` and the game uses the same code. The build bundles them in (`esbuild`), so the image only runs `dist/index.js`.

## Routes

| Route | |
| --- | --- |
| `GET /health` | 200 while Postgres answers, else 503 |
| `GET /save` | The player's `{ save, revision }`, 404 before the first push |
| `PUT /save` | Body `{ save, base }`: the device's save and the revision it last got (`null` if it never synced). Stores the save as is when `base` is the latest revision, else merges both. Returns `{ save, revision, merged }` |

`/save` needs `Authorization: Bearer <Clerk session token>`. CORS allows `https://www.pokemonsurvivors.com`, `https://pokemonsurvivors.com`, any `http://localhost` port and whatever `CORS_ORIGINS` adds.

## Environment

| Variable | |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (required) |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API keys → Secret key (required) |
| `CLERK_JWT_KEY` | Optional. Clerk's JWT public key (PEM), to verify tokens without fetching Clerk's keys |
| `CORS_ORIGINS` | Optional. Extra allowed origins, comma separated (e.g. a Vercel preview) |
| `PORT` | Default `3000` |

## Database

Migrations are plain SQL files in `migrations/`, run in name order at boot (each once, tracked in the `migrations` table). To change the schema, add the next numbered file; never edit one that already ran.

- `users`: one row per Clerk user id. The ranking adds its profile columns here.
- `saves`: one JSONB save per user, with the save's schema `version` and a `revision` bumped on every push.

## Local development

```bash
docker run -d --name survivors-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=survivors -p 5433:5432 postgres:17-alpine
cp .env.example .env   # fill CLERK_SECRET_KEY
npm install
npm run dev            # http://localhost:3000
```

In the game, set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL=http://localhost:3000` in `.env.local` at the repository root.

`npm run typecheck` checks the server together with the shared game code; CI runs it.

## Deploy (Dokploy)

### What runs

The Dokploy project **Pokémon Survivors** has two services:

- **Postgres 18** `survivors-postgres-kwkfm5`, with no external port. Only the API reaches it, over Dokploy's internal network.
- **App `api`**: built with the Dockerfile `server/Dockerfile` and build context `.` (the repository root, since the API bundles `src/`). It listens on container port `3000` behind `api.pokemonsurvivors.com`, with a Let's Encrypt certificate.

### When it deploys

A push to `main` deploys the API automatically, but only when it touches `server/**`, `src/game/**`, `src/data/**` or `src/engine/**`. Those are the folders the API bundle imports. **If the bundle starts importing another folder of `src/`, add it to this list in Dokploy** (and here). Otherwise a change there ships to the site but not to the API, and the two drift apart.

### Rollout

New versions roll out with no downtime:

- The new container starts before the old one stops (start-first).
- If its `HEALTHCHECK` (`/health`) doesn't pass within 30 s, Swarm rolls back to the previous version on its own. That includes a migration that breaks the boot.

### Migrations

- The files are numbered and only move forward. Never edit a migration that already ran: add the next file.
- Every change must work with the previous version of the API, since both run side by side during a rollout. For example, add a nullable column first, and drop the old one only in a later PR.
- All pending migrations run in one transaction, so a failure leaves nothing half applied.

### Environment

| Variable | Where | |
| --- | --- | --- |
| `DATABASE_URL` | Dokploy (`api`) | Internal connection string of `survivors-postgres-kwkfm5` |
| `CLERK_SECRET_KEY` | Dokploy (`api`) | Production instance secret key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel, production only | `pk_live_…`, which only works on `pokemonsurvivors.com` |
| `VITE_API_URL` | Vercel, production only | `https://api.pokemonsurvivors.com` |

### Local development

The `pk_live` key doesn't work on `localhost`. To test sign-in locally, put the keys of Clerk's **development** instance in `.env.local` at the repository root (and its secret key in `server/.env`).
