const CACHE_LIMIT = 256;
const embeddingCache = new Map<string, number[]>();

function cacheGet(key: string): number[] | undefined {
  const value = embeddingCache.get(key);
  if (!value) return undefined;
  embeddingCache.delete(key);
  embeddingCache.set(key, value);
  return value;
}

function cacheSet(key: string, value: number[]): void {
  embeddingCache.delete(key);
  embeddingCache.set(key, value);
  if (embeddingCache.size > CACHE_LIMIT) {
    const oldest = embeddingCache.keys().next().value;
    if (oldest) embeddingCache.delete(oldest);
  }
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text], 'RETRIEVAL_QUERY');
  return embedding;
}

export async function embedTexts(
  texts: string[],
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_DOCUMENT',
): Promise<number[][]> {
  const baseUrl = (process.env.RAG_EMBEDDING_BASE_URL || 'https://api.openai.com/v1')
    .replace(/\/+$/, '');
  const provider = process.env.RAG_EMBEDDING_PROVIDER
    || (baseUrl.includes('generativelanguage.googleapis.com') ? 'gemini' : 'openai');
  if (provider !== 'openai' && provider !== 'gemini') {
    throw new Error('RAG_EMBEDDING_PROVIDER must be either "openai" or "gemini".');
  }
  const model = process.env.RAG_EMBEDDING_MODEL
    || (provider === 'gemini' ? 'gemini-embedding-001' : 'text-embedding-3-small');
  const dimensions = Number(process.env.RAG_EMBEDDING_DIMENSIONS || 1536);
  const apiKey = provider === 'gemini'
    ? process.env.GEMINI_API_KEY
      || process.env.RAG_EMBEDDING_API_KEY
      || process.env.RAG_LLM_API_KEY
      || process.env.OPENAI_API_KEY
    : process.env.RAG_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey && (provider === 'gemini' || baseUrl.includes('api.openai.com'))) {
    throw new Error(
      provider === 'gemini'
        ? 'GEMINI_API_KEY or RAG_EMBEDDING_API_KEY must be configured for Gemini embeddings.'
        : 'RAG_EMBEDDING_API_KEY or OPENAI_API_KEY must be configured for OpenAI embeddings.',
    );
  }
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 2000) {
    throw new Error('RAG_EMBEDDING_DIMENSIONS must be an integer between 1 and 2000 for pgvector.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider === 'gemini') {
    if (!apiKey) throw new Error('GEMINI_API_KEY or RAG_EMBEDDING_API_KEY must be configured for Gemini embeddings.');
    headers['x-goog-api-key'] = apiKey;
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const embeddings: number[][] = new Array(texts.length);
  const pending = new Map<string, { text: string; positions: number[] }>();

  texts.forEach((text, position) => {
    const key = `${provider}:${baseUrl}:${model}:${dimensions}:${taskType}:${text}`;
    const cached = cacheGet(key);
    if (cached) {
      embeddings[position] = cached;
      return;
    }
    const existing = pending.get(key);
    if (existing) existing.positions.push(position);
    else pending.set(key, { text, positions: [position] });
  });

  const uniquePending = [...pending.entries()];
  for (let offset = 0; offset < uniquePending.length; offset += 64) {
    const batch = uniquePending.slice(offset, offset + 64);
    const requestUrl = provider === 'gemini'
      ? `${baseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents`
      : `${baseUrl}/embeddings`;
    const requestBody = provider === 'gemini'
      ? {
        requests: batch.map(([, item]) => ({
          model: `models/${model}`,
          content: { parts: [{ text: item.text }] },
          taskType,
          outputDimensionality: dimensions,
        })),
      }
      : { model, input: batch.map(([, item]) => item.text) };
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`${provider} embedding request failed with status ${response.status}.`);
    }

    const result: unknown = await response.json();
    const batchEmbeddings = provider === 'gemini'
      ? getGeminiEmbeddings(result)
      : getOpenAiEmbeddings(result);
    if (!batchEmbeddings || batchEmbeddings.length !== batch.length) {
      throw new Error('Embedding provider returned an invalid response.');
    }

    const ordered: (number[] | undefined)[] = new Array(batch.length).fill(undefined);
    batchEmbeddings.forEach((item, responseIndex) => {
      const index = typeof item.index === 'number' ? item.index : responseIndex;
      if (!Number.isInteger(index) || index < 0 || index >= batch.length || ordered[index]) {
        throw new Error('Embedding provider returned an invalid vector index.');
      }
      if (item.values.length !== dimensions) {
        throw new Error(
          `Embedding provider returned ${item.values.length} values; RAG_EMBEDDING_DIMENSIONS is ${dimensions}.`,
        );
      }
      ordered[index] = item.values;
    });
    if (ordered.some((embedding) => !embedding)) {
      throw new Error('Embedding provider omitted one or more requested vectors.');
    }

    ordered.forEach((embedding, index) => {
      if (!embedding) throw new Error('Embedding provider omitted one or more requested vectors.');
      const [key, item] = batch[index];
      cacheSet(key, embedding);
      item.positions.forEach((position) => {
        embeddings[position] = embedding;
      });
    });
  }

  return embeddings;
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

interface ProviderEmbedding {
  values: number[];
  index?: number;
}

function getOpenAiEmbeddings(value: unknown): ProviderEmbedding[] | null {
  if (typeof value !== 'object' || value === null || !('data' in value)) return null;
  const data = (value as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const embeddings: ProviderEmbedding[] = [];
  for (const item of data) {
    if (!isRecord(item) || !isFiniteVector(item.embedding)) return null;
    embeddings.push({ values: item.embedding, index: typeof item.index === 'number' ? item.index : undefined });
  }
  return embeddings;
}

function getGeminiEmbeddings(value: unknown): ProviderEmbedding[] | null {
  if (!isRecord(value) || !Array.isArray(value.embeddings) || value.embeddings.length === 0) {
    return null;
  }
  const embeddings: ProviderEmbedding[] = [];
  for (const item of value.embeddings) {
    if (!isRecord(item) || !isFiniteVector(item.values)) return null;
    embeddings.push({ values: item.values });
  }
  return embeddings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteVector(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}
