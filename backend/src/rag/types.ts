export type RagRoute =
  | 'DATABASE_ONLY'
  | 'DOCUMENT_ONLY'
  | 'HYBRID'
  | 'SMALL_TALK'
  | 'OUT_OF_SCOPE';

export interface RagIdentity {
  id: string;
  role: string;
}

export interface RagSource {
  type: 'database' | 'document';
  table?: string;
  file?: string;
  page?: number;
}

export interface DocumentChunk {
  id: string;
  source: string;
  page: number;
  content: string;
  embedding?: number[];
}

export interface RetrievedDocument extends DocumentChunk {
  similarity: number;
}

export interface DatabaseContext {
  table: string;
  records: Record<string, unknown>[];
}
