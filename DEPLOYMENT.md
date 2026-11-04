# Deploy GYMMIS with Vercel and Render

This repository contains two separate apps: the Next.js frontend in `frontend/`
and the Express/Prisma API in `backend/`. Deploy the API and PostgreSQL database
to Render, then deploy the frontend to Vercel.

## 1. Push the project to GitHub

Push this repository to a GitHub repository that you can connect to both
Render and Vercel. Do not commit `.env` files, API keys, database passwords,
uploaded gym files, or generated secrets.

## 2. Create the Render PostgreSQL database

1. In Render, create a PostgreSQL database and select a region.
2. Keep the database private. Copy its **Internal Database URL** for the
   backend service when both are in the same Render region. Otherwise use the
   external URL if necessary.
3. Keep the database in the same region as the backend to reduce latency.

## 3. Deploy the backend API on Render

Create a **Web Service** from the repository:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run prisma:generate && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Set these environment variables in the Render service. Use Render's database
URL and generate unique secrets; do not copy credentials from chat or source
control.

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal Database URL from the Render PostgreSQL database |
| `JWT_SECRET` | New random secret, at least 32 characters |
| `JWT_REFRESH_SECRET` | A different new random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `CORS_ORIGIN` | The Vercel production URL, e.g. `https://your-app.vercel.app` |
| `RAG_DATA_DIR` | `/var/data/rag` |
| `UPLOADS_DIR` | `/var/data/uploads` |

Add model-provider variables only if enabling the gym assistant, such as
`GEMINI_API_KEY`, `RAG_LLM_API_KEY`, and `RAG_EMBEDDING_API_KEY`. Store secrets
in Render's Environment settings, never in the frontend or Git.

### Persist uploads on Render

The backend stores the gym description and profile images on disk. Render's
default filesystem is temporary, so create and attach a persistent disk to the
backend service with mount path `/var/data`. The variables above put the
description under `/var/data/rag` and profile images under
`/var/data/uploads`.

The source file `backend/data/gym_description.*` is not committed; after
deployment, upload the gym description again through the authenticated admin
upload endpoint. This stores it on the persistent disk and indexes it.

### Initialize the database schema

After setting `DATABASE_URL`, initialize an empty production database once.
From the Render service Shell, run:

```sh
npm run prisma:push
```

This applies the current Prisma schema to the database. Back up the database
before applying schema changes to a database that contains real data. Do not
run `npm run prisma:seed` on a database with existing data; the seed script
deletes existing gym records. If this is a brand-new empty database and you
want sample records, you may run the seed script once from the Render Shell,
then sign in and immediately change the seeded owner password.

If enabling pgvector for assistant document search, make sure the Render
PostgreSQL instance supports the `vector` extension and enable it before
uploading/indexing a file:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Check the API after deployment at
`https://<your-render-service>.onrender.com/api/health`. It should report
`"status": "online"` and `"database": {"connected": true}`.

## 4. Deploy the frontend on Vercel

Import the same GitHub repository into Vercel and configure:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Install Command | `npm ci` |

Add this environment variable to the Vercel project for **Production** (and
Preview too if previews should use the API):

```text
NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com/api
```

`NEXT_PUBLIC_API_BASE_URL` is embedded into the frontend at build time. Set it
before the deployment and redeploy after changing it. It must include `/api`.

## 5. Allow the deployed frontend in backend CORS

Set Render's `CORS_ORIGIN` to the exact browser origin, without a trailing
slash. For example:

```text
https://your-app.vercel.app
```

For a custom domain, use that domain instead (or add both, comma-separated):

```text
https://gym.example.com,https://your-app.vercel.app
```

If using Vercel preview deployments, their generated hostnames differ. Add the
specific preview origin(s) to `CORS_ORIGIN` when needed. The API intentionally
does not allow every origin in production.

## 6. Verify

1. Open the Vercel production URL and sign in.
2. Confirm dashboard data loads; if not, check the browser console, Render
   service logs, `NEXT_PUBLIC_API_BASE_URL`, and `CORS_ORIGIN`.
3. Visit the Render `/api/health` URL and confirm the database connection.
4. If using the assistant, upload the gym description from an OWNER or MANAGER
   account and verify the admin health endpoint reports indexed chunks.
5. Upload a profile image and confirm it remains available after a Render
   redeploy.

## Operational notes

- The backend uses a membership lifecycle scheduler. Keep one Render backend
  instance unless the scheduler is changed to use a distributed lock; multiple
  instances could run the scheduled work more than once.
- Use a production database and separate development credentials. Do not use
  seeded demo credentials for real production access.
- The frontend's demo-account hint is development-only; production login does
  not expose demo credentials.
