# GYMMIS Backend

GYMMIS is an Express/TypeScript API using Prisma and PostgreSQL. It includes
JWT-based access control, gym management endpoints, and an optional grounded
gym assistant.

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL for application data
- An OpenAI API key, or an OpenAI-compatible chat and embedding service
- ChromaDB for local vector storage, or PostgreSQL with the pgvector extension

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set `DATABASE_URL`, strong JWT secrets, and the assistant provider settings in
`.env`. Then prepare the existing Prisma schema:

```powershell
npm run prisma:generate
npm run prisma:push
npm run dev
```

For production deployment with Vercel and Render, follow the repository
[deployment guide](../DEPLOYMENT.md). Configure `RAG_DATA_DIR` and
`UPLOADS_DIR` to point to persistent storage when deploying the backend to
Render; otherwise uploaded gym descriptions and profile images can be lost when
the service restarts or redeploys.

`npm run prisma:seed` is optional and destructive: the current seed deletes
existing gym records before creating demo data. Do not run it against a real
gym database.

Run backend verification with:

```powershell
npm run build
npm test
```

## Gym assistant configuration

The assistant uses curated Prisma queries for structured context and never
generates SQL from user questions. Structured reads are parameterized by
Prisma, limited to 100 rows, and run with a five-second PostgreSQL statement
timeout. User identity comes from the authenticated JWT, not a client-supplied
`user_id`.

Configure these values in `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | empty | Shared OpenAI API key; keep it on the backend only |
| `GEMINI_API_KEY` | empty | Gemini API key for native Gemini embeddings |
| `RAG_LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible chat endpoint |
| `RAG_LLM_MODEL` | `gpt-4o-mini` | Chat model |
| `RAG_EMBEDDING_PROVIDER` | `openai` | Embedding adapter: `openai` or native `gemini` |
| `RAG_EMBEDDING_BASE_URL` | `https://api.openai.com/v1` | Embeddings endpoint; Gemini uses its native API base ending `/v1beta` |
| `RAG_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model; Gemini uses `gemini-embedding-001` |
| `RAG_EMBEDDING_DIMENSIONS` | `1536` | Embedding width; must match the configured model and pgvector column |
| `RAG_VECTOR_STORE` | `pgvector` in production, otherwise `chroma` | `chroma` or `pgvector` |
| `RAG_CHROMA_URL` | `http://localhost:8000` | ChromaDB HTTP service |
| `RAG_DATA_DIR` | `data` | Gym description file directory, relative to `backend` |

For local development with ChromaDB, run a persistent Chroma service and set
`RAG_VECTOR_STORE=chroma`:

```powershell
docker run --name gymmis-chroma -p 8000:8000 -v gymmis-chroma-data:/chroma/chroma chromadb/chroma:latest
```

For production, install pgvector on the PostgreSQL server and enable the
extension in the target database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The backend creates the `rag_document_chunks` table and cosine HNSW index when
the vector store is first used. The application database role must be allowed
to create those objects, or an administrator can create/grant them in advance.
If you use an embedding model other than `text-embedding-3-small`, set
`RAG_EMBEDDING_DIMENSIONS` to its actual vector size.

The defaults use OpenAI's API. For Gemini, set `RAG_EMBEDDING_PROVIDER=gemini`,
`RAG_EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta`,
`RAG_EMBEDDING_MODEL=gemini-embedding-001`, and
`RAG_EMBEDDING_DIMENSIONS=1536`; configure `GEMINI_API_KEY` or reuse the Gemini
credential in `RAG_EMBEDDING_API_KEY`. Gemini chat still uses the OpenAI-compatible
chat base URL and its chat model/key. For a local or hosted OpenAI-compatible service,
set the relevant `RAG_LLM_BASE_URL`, `RAG_LLM_MODEL`,
`RAG_EMBEDDING_BASE_URL`, `RAG_EMBEDDING_MODEL`, and optional provider-specific
`RAG_LLM_API_KEY` / `RAG_EMBEDDING_API_KEY`. Never put provider keys in the
frontend environment.

## Add the gym description file

Upload one PDF, DOCX, TXT, or Markdown description. The backend extracts text,
splits it into overlapping chunks (about 700 tokens, 100-token overlap),
embeds the chunks, and replaces the previous vector index. PDF chunks retain
their page number; DOCX, TXT, and Markdown citations use page 1. Uploaded files
are saved under `backend/data/`, which is git-ignored.

Alternatively, place a file named `gym_description.pdf`, `.docx`, `.txt`, or
`.md` in `backend/data/` and call the reindex endpoint. An admin bearer token
(OWNER or MANAGER) is required for all `/admin` assistant endpoints.
Until a vector index exists, document questions use a local keyword-overlap
search of that file. This fallback requires no vector extension or embedding
API, but is less semantically accurate than vector search. Once pgvector is
available and the file is reindexed, vector search is used automatically.

## API

All assistant endpoints are under `/api/rag`. `POST /chat` requires an
authenticated user token. The frontend chat drawer sends the message and the
backend derives the user scope from that token.

```json
POST /api/rag/chat
{
  "message": "How much is the annual membership?"
}
```

Example response:

```json
{
  "success": true,
  "answer": "The annual membership costs ...",
  "sources": [
    { "type": "database", "table": "Package" }
  ],
  "confidence": 0.85,
  "route": "DATABASE_ONLY"
}
```

Database citations intentionally omit internal record IDs. `route` is one of
`DATABASE_ONLY`, `DOCUMENT_ONLY`, `HYBRID`, `SMALL_TALK`, or `OUT_OF_SCOPE`.
`confidence` is a retrieval-evidence score (database matches are exact; document
scores use vector similarity), not a calibrated probability.
Small talk and general questions (`SMALL_TALK` and `OUT_OF_SCOPE`) are sent to
the configured LLM without gym-record context and can be answered from its
general knowledge. These replies have no source citations. The LLM is instructed
not to guess facts about this particular gym in this mode. Gym-specific
questions are still grounded in retrieved records only. If those records do
not contain enough information, the answer is exactly:

> I don't have that information in the gym's records.

Chat example (replace the placeholder with a valid access token):

```bash
curl -X POST http://localhost:5000/api/rag/chat \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are your opening hours?"}'
```

Upload or replace the description file (multipart field name is `file`, maximum
10 MB):

```bash
curl -X POST http://localhost:5000/api/rag/admin/upload-file \
  -H "Authorization: Bearer <OWNER_OR_MANAGER_ACCESS_TOKEN>" \
  -F "file=@./gym_description.pdf"
```

The other admin endpoints are `POST /api/rag/admin/reindex` and
`GET /api/rag/admin/health`.

## Database coverage and access

Supported structured records in the current Prisma schema include active
trainers and package prices; a user's own memberships, payments, attendance,
and training sessions; and management-level aggregate member, payment,
attendance, expense, user-account, and scheduled-training-session data.
Management-level queries are limited to OWNER and MANAGER; member and trainer
queries are scoped to the signed-in user. Contact details and internal IDs are
not passed to the answer model.

The current schema has no group-class timetable, equipment inventory, or room
tables. The assistant will only answer those questions when the uploaded gym
description contains the information; otherwise it returns the exact fallback.
TrainingSession records are personal training appointments, not group classes.

## UI placement

The Sparkles button appears in the dashboard navbar directly to the left of the
existing profile avatar, aligned to the same 40-pixel control height. Clicking
it opens a right-side desktop drawer or full-screen mobile panel. Conversation
history stays in memory while navigating within the dashboard; it is not
stored across a full reload.

## HOW TO USE

1. Configure the backend database and model credentials.
2. Start ChromaDB for local development, or enable pgvector in PostgreSQL.
3. Start the backend with `npm run dev`, then sign in to GYMMIS.
4. As an OWNER or MANAGER, upload the description file to
   `/api/rag/admin/upload-file` or place it in `backend/data/` and reindex.
5. Click the Sparkles icon beside the profile avatar and ask a question.
6. Review the source chips under each answer.

## WHAT TO CHANGE FOR MY REAL PROJECT

- `backend/.env`: point `DATABASE_URL` to the real PostgreSQL database and set
  real JWT/provider secrets and vector-store settings.
- `backend/data/gym_description.*`: upload or replace this local, ignored file
  with the real gym description.
- `backend/src/rag/sqlTool.ts`: add allowlisted, parameterized Prisma queries
  only after adding real domain models (for example equipment or group classes)
  to the Prisma schema and reviewing role-based access.
- `frontend/src/components/layout/navbar.tsx`: this is the existing navbar
  patched to place the AI icon beside the profile; the drawer is mounted by
  `frontend/src/components/layout/dashboard-shell.tsx`.

## Project structure

```text
backend/
├── data/                 # Local gym description file (git-ignored)
├── prisma/               # Existing Prisma schema and seed data
├── src/
│   ├── controllers/       # Existing API controllers and RAG endpoints
│   ├── rag/               # Router, retrieval, ingestion, vector store, chain
│   └── routes/            # Express API routes
└── tests/rag.test.ts      # RAG routing, fallback, and chunking tests
```
