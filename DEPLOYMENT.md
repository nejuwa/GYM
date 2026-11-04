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
free-tier Frankfurt PostgreSQL database and Node API service. In Render, choose
**New > Blueprint**, connect the GitHub repository, select the branch, review
the resources, and deploy. The Blueprint generates separate JWT secrets,
connects the backend to the database, and applies the Prisma schema when the
service starts.

During Blueprint setup, provide `CORS_ORIGIN` as the exact Vercel production
origin, for example `https://your-app.vercel.app` (no trailing slash). Change
the region in `render.yaml` if you want to host the app elsewhere. The
Blueprint uses Render's `free` plan for the API and database.

The API build command is
`npm ci --include=dev && npm run prisma:generate && npm run build`; the start
command is `npm run prisma:push && npm start`; and Render health checks
`/api/health`.

On the free plan, Render does not support a pre-deploy command, so the start
command runs `npm run prisma:push` before starting the API. This happens on
every service start. Review schema changes carefully: `db push` is not a
migration history and can affect existing data. The seed script is not run
automatically because it deletes existing gym records. A new, empty database
has no login account by default.

### Free-tier limitations

This Blueprint avoids paid Render resources, but the free tier is intended for
testing and hobby use, not production:

- The API sleeps after 15 minutes without traffic and can take about a minute
  to wake. Its filesystem is ephemeral; uploaded profile images and the source
  gym-description file may disappear on sleep, restart, or redeploy. Free web
  services cannot attach persistent disks.
- Render's free PostgreSQL database is limited to 1 GB and expires 30 days
  after creation. Upgrade it before expiry to avoid losing the database and
  its data.
- Free services may restart or have maintenance downtime, and the workspace
  has monthly free-instance-hour limits.

Keep backups of any important data, and do not use this configuration for
production or real member records. For persistent uploads and an always-on API,
use paid Render service and disk plans.

Add model-provider variables only if enabling the gym assistant, such as
`GEMINI_API_KEY`, `RAG_LLM_API_KEY`, and `RAG_EMBEDDING_API_KEY`. Store secrets
in Render's Environment settings, never in the frontend or Git.

### Uploads on the free tier

The source file `backend/data/gym_description.*` is not committed; after
deployment, upload the gym description again through the authenticated admin
upload endpoint. The uploaded file is stored on the service's temporary
filesystem and may need to be uploaded again after a restart or redeploy.

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
5. Upload a profile image and confirm it is served correctly. Remember that
   free Render files may disappear on restart, spin-down, or redeploy.

## Operational notes

- The backend uses a membership lifecycle scheduler. Keep one Render backend
  instance unless the scheduler is changed to use a distributed lock; multiple
  instances could run the scheduled work more than once.
- Use a production database and separate development credentials. Do not use
  seeded demo credentials for real production access.
- The frontend's demo-account hint is development-only; production login does
  not expose demo credentials.
