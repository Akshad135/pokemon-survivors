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

1. Create a Postgres service and copy its internal connection string.
2. Create an application from this repository with the **Dockerfile** build type: Dockerfile path `server/Dockerfile`, build context `.` (the repository root, since the API bundles `src/`).
3. Set `DATABASE_URL` and `CLERK_SECRET_KEY` (production instance keys).
4. Domain `api.pokemonsurvivors.com` → container port `3000`, HTTPS on. The image has a `HEALTHCHECK` on `/health`.
5. On Vercel, set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL=https://api.pokemonsurvivors.com` and redeploy the site.
