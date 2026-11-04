# GYMMIS

GYMMIS is a gym management system with a Next.js web app and an Express API
backed by PostgreSQL and Prisma. The dashboard includes member, trainer,
membership, payment, attendance, and reporting workflows, plus an optional
gym-data assistant.

## Project layout

- [`frontend/`](./frontend/) — Next.js application
- [`backend/`](./backend/) — Express/TypeScript API and Prisma schema
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — deploy the frontend to Vercel and API/database to Render

## Local development

Requirements: Node.js 20+, npm, and PostgreSQL.

1. Configure the backend:

   ```powershell
   cd backend
   npm ci
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` and strong local JWT secrets in `backend/.env`, then
   generate the Prisma client and create/update the local database schema:

   ```powershell
   npm run prisma:generate
   npm run prisma:push
   ```

2. Start the API in a terminal from `backend/`:

   ```powershell
   npm run dev
   ```

   The API defaults to `http://localhost:5000`; its database health endpoint is
   `http://localhost:5000/api/health`.

3. Configure and start the frontend in a second terminal:

   ```powershell
   cd frontend
   npm ci
   Copy-Item .env.example .env.local
   npm run dev
   ```

   The default API URL is `http://localhost:5000/api`. Open
   `http://localhost:3000`.

The backend seed command (`npm run prisma:seed`) deletes existing gym records
before adding sample data. Use it only with a disposable development database.

## Gym assistant

The assistant can answer using the signed-in user's authorized database
records, an uploaded gym description, and general knowledge for non-gym
questions. To enable it, configure the provider and vector-store variables in
`backend/.env`. See [`backend/README.md`](./backend/README.md) for supported
settings, document upload, and API details. Never put provider credentials in
the frontend.

## Deployment

Deploy `backend/` as a Render web service and `frontend/` as a Vercel project.
The deployment guide covers PostgreSQL, environment variables, CORS, persistent
storage for uploads, and production verification:

**[Deploy GYMMIS with Vercel and Render](./DEPLOYMENT.md)**

## Validation

From `backend/`:

```powershell
npm run build
npm test
```

From `frontend/`:

```powershell
npm run build
```
