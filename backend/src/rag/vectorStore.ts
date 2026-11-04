import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import type { DocumentChunk, RetrievedDocument } from './types';

const COLLECTION = 'gym_description';

function vectorStoreMode(): 'chroma' | 'pgvector' {
  const configured = process.env.RAG_VECTOR_STORE;
  if (configured === 'chroma' || configured === 'pgvector') return configured;
  if (configured) throw new Error('RAG_VECTOR_STORE must be either "chroma" or "pgvector".');
  return process.env.NODE_ENV === 'production' ? 'pgvector' : 'chroma';
}

function embeddingDimensions(): number {
  const dimensions = Number(process.env.RAG_EMBEDDING_DIMENSIONS || 1536);
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 2000) {
    throw new Error('RAG_EMBEDDING_DIMENSIONS must be an integer between 1 and 2000 for pgvector.');
  }
  return dimensions;
}

function vectorLiteral(vector: number[]): string {
  if (!vector.length || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('Cannot store an invalid embedding vector.');
  }
  return `[${vector.join(',')}]`;
}

async function ensurePgvectorTable(): Promise<void> {
  const dimensions = embeddingDimensions();
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rag_document_chunks (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      page INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding vector(${dimensions}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS rag_document_chunks_embedding_idx
    ON rag_document_chunks USING hnsw (embedding vector_cosine_ops)
  `);
}

async function chromaRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = (process.env.RAG_CHROMA_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const tenant = process.env.RAG_CHROMA_TENANT || 'default_tenant';
  const database = process.env.RAG_CHROMA_DATABASE || 'default_database';
  const response = await fetch(
    `${baseUrl}/api/v2/tenants/${encodeURIComponent(tenant)}/databases/${encodeURIComponent(database)}${path}`,
    {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`ChromaDB request failed with status ${response.status}.`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function ensureChromaCollection(): Promise<string> {
  const result = await chromaRequest<{ id?: string }>('/collections', {
    method: 'POST',
    body: JSON.stringify({ name: COLLECTION, get_or_create: true }),
  });
  if (!result.id) throw new Error('ChromaDB did not return a collection identifier.');
  return result.id;
}

async function findChromaCollection(): Promise<string | null> {
  const collections = await chromaRequest<{ id: string; name: string }[]>('/collections');
  return collections.find((collection) => collection.name === COLLECTION)?.id || null;
}

async function pgvectorTableExists(): Promise<boolean> {
  const [table] = await prisma.$queryRaw<{ tableName: string | null }[]>`
    SELECT to_regclass('rag_document_chunks')::text AS "tableName"
  `;
  return table?.tableName !== null && table?.tableName !== undefined;
}

export async function replaceDocumentIndex(chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) throw new Error('The gym description contains no indexable text.');
  if (chunks.some((chunk) => !chunk.embedding)) {
    throw new Error('All document chunks must be embedded before indexing.');
  }

  if (vectorStoreMode() === 'pgvector') {
    const dimensions = embeddingDimensions();
    if (chunks.some((chunk) => chunk.embedding?.length !== dimensions)) {
      throw new Error(
        `RAG embeddings must contain ${dimensions} values to match RAG_EMBEDDING_DIMENSIONS.`,
      );
    }
    await ensurePgvectorTable();
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`DELETE FROM rag_document_chunks`;
      for (let offset = 0; offset < chunks.length; offset += 100) {
        const values = chunks.slice(offset, offset + 100).map((chunk) => Prisma.sql`(
          ${chunk.id},
          ${chunk.source},
          ${chunk.page},
          ${chunk.content},
          ${vectorLiteral(chunk.embedding!)}::vector
        )`);
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO rag_document_chunks (id, source, page, content, embedding)
          VALUES ${Prisma.join(values)}
        `);
      }
    }, { maxWait: 5000, timeout: 120_000 });
    return;
  }

  const collectionId = await ensureChromaCollection();
  const existing = await chromaRequest<{ ids?: string[] }>(
    `/collections/${collectionId}/get?include=[]`,
  );
  const previousIds = new Set(existing.ids || []);
  const nextIds = new Set(chunks.map((chunk) => chunk.id));
  try {
    for (let offset = 0; offset < chunks.length; offset += 64) {
      const batch = chunks.slice(offset, offset + 64);
      await chromaRequest(`/collections/${collectionId}/upsert`, {
        method: 'POST',
        body: JSON.stringify({
          ids: batch.map((chunk) => chunk.id),
          embeddings: batch.map((chunk) => chunk.embedding),
          documents: batch.map((chunk) => chunk.content),
          metadatas: batch.map((chunk) => ({ source: chunk.source, page: chunk.page })),
        }),
      });
    }
  } catch (error) {
    const newIds = [...nextIds].filter((id) => !previousIds.has(id));
    if (newIds.length) {
      await chromaRequest(`/collections/${collectionId}/delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: newIds }),
      }).catch((cleanupError) => {
        console.error(JSON.stringify({
          event: 'rag.chroma.cleanup.error',
          errorType: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
        }));
      });
    }
    throw error;
  }

  const obsolete = [...previousIds].filter((id) => !nextIds.has(id));
  if (obsolete.length) {
    await chromaRequest(`/collections/${collectionId}/delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: obsolete }),
    });
  }
}

export async function searchDocumentIndex(
  embedding: number[],
  limit = 4,
): Promise<RetrievedDocument[]> {
  if (vectorStoreMode() === 'pgvector') {
    if (!await pgvectorTableExists()) return [];
    const vector = vectorLiteral(embedding);
    const rows = await prisma.$queryRawUnsafe<{
      id: string;
      source: string;
      page: number;
      content: string;
      similarity: number;
    }[]>(
      `SELECT id, source, page, content,
        1 - (embedding <=> $1::vector) AS similarity
       FROM rag_document_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vector,
      limit,
    );
    return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
  }

  const collectionId = await findChromaCollection();
  if (!collectionId) return [];
  const result = await chromaRequest<{
    ids?: string[][];
    documents?: (string | null)[][];
    metadatas?: ({ source?: string; page?: number } | null)[][];
    distances?: number[][];
  }>(`/collections/${collectionId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      query_embeddings: [embedding],
      n_results: limit,
      include: ['documents', 'metadatas', 'distances'],
    }),
  });

  const ids = result.ids?.[0] || [];
  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];
  return ids.flatMap((id, index) => {
    const content = documents[index];
    const metadata = metadatas[index];
    const page = metadata?.page;
    const source = metadata?.source;
    if (!content || !metadata || typeof page !== 'number' || typeof source !== 'string') return [];
    return [{
      id,
      source,
      page,
      content,
      similarity: Math.max(0, Math.min(1, 1 - (distances[index] ?? 1))),
    }];
  });
}

export async function getDocumentIndexHealth(): Promise<{ indexedChunks: number }> {
  if (vectorStoreMode() === 'pgvector') {
    if (!await pgvectorTableExists()) return { indexedChunks: 0 };
    const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM rag_document_chunks
    `;
    return { indexedChunks: Number(row?.count || 0) };
  }

  const collectionId = await findChromaCollection();
  if (!collectionId) return { indexedChunks: 0 };
  const result = await chromaRequest<{ ids?: string[] }>(
    `/collections/${collectionId}/get?include=[]`,
  );
  return { indexedChunks: result.ids?.length || 0 };
}
