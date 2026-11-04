# Deploy GYMMIS with Vercel and Render

This repository contains two separate apps: the Next.js frontend in `frontend/`
and the Express/Prisma API in `backend/`. Deploy the API and PostgreSQL database
to Render, then deploy the frontend to Vercel.

## 1. Push the project to GitHub

Push this repository to a GitHub repository that you can connect to both
Render and Vercel. Do not commit `.env` files, API keys, database passwords,
uploaded gym files, or generated secrets.

## 2. Deploy the API and database from the Render Blueprint

The repository includes [`render.yaml`](./render.yaml), which defines a
Frankfurt PostgreSQL database and the Node API service. In Render, choose
**New > Blueprint**, connect the GitHub repository, select the branch, review
the resources, and deploy. The Blueprint generates separate JWT secrets,
connects the backend to the database, attaches persistent storage, and applies
the Prisma schema before deploying the service.

During Blueprint setup, provide `CORS_ORIGIN` as the exact Vercel production
origin, for example `https://your-app.vercel.app` (no trailing slash). Change
the region in `render.yaml` if you want to host the app elsewhere. The
Blueprint uses paid Render plans for the API, database, and persistent disk.

The API build command is
`npm ci --include=dev && npm run prisma:generate && npm run build`; the start
command is `npm start`; and Render health checks `/api/health`.

The Prisma `db push` runs before each deploy to keep the database schema
aligned with Prisma. Review schema changes and back up real data before
deployment: `db push` is not a migration history and schema changes can affect
existing data. The seed script is not run automatically because it deletes
existing gym records. A new, empty database has no login account by default.
If you need initial demo records and an owner account, run
`npm run prisma:seed` once from the Render service Shell after the first
successful deploy, and immediately change the owner's password. Never run this
command against a database containing real records.

Add model-provider variables only if enabling the gym assistant, such as
`GEMINI_API_KEY`, `RAG_LLM_API_KEY`, and `RAG_EMBEDDING_API_KEY`. Store secrets
in Render's Environment settings, never in the frontend or Git.

### Persist uploads on Render

The backend stores the gym description and profile images on disk. Render's
default filesystem is temporary, so the Blueprint attaches a persistent disk
at `/var/data`. The configured paths store the description under
`/var/data/rag` and profile images under `/var/data/uploads`.

The source file `backend/data/gym_description.*` is not committed; after
deployment, upload the gym description again through the authenticated admin
upload endpoint. This stores it on the persistent disk and indexes it.

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
