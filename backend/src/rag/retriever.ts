import { embedText } from './embedder';
import { loadGymDescriptionChunks } from './documentIngestion';
import { getDocumentIndexHealth, searchDocumentIndex } from './vectorStore';
import type { DocumentChunk, RetrievedDocument } from './types';

const TOP_K = 4;
const MIN_SIMILARITY = 0.25;
const LOCAL_MIN_COVERAGE = 0.34;
const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'does', 'for',
  'from', 'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'our',
  'please', 'tell', 'that', 'the', 'their', 'this', 'to', 'we', 'what',
  'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);
const INJECTION_PATTERN =
  /\b(ignore|disregard|override)\b.{0,80}\b(previous|above|system|developer|instructions?|prompt)\b|\b(reveal|print|show)\b.{0,50}\b(system prompt|developer message|secret instructions)\b/i;

export async function retrieveDocuments(question: string): Promise<RetrievedDocument[]> {
  const health = await getDocumentIndexHealth();
  if (health.indexedChunks === 0) {
    return rankLocalDocuments(question, await loadGymDescriptionChunks());
  }
  const embedding = await embedText(question);
  const results = await searchDocumentIndex(embedding, TOP_K);
  return results.filter((result) =>
    result.similarity >= MIN_SIMILARITY && !INJECTION_PATTERN.test(result.content),
  );
}

export function rankLocalDocuments(
  question: string,
  chunks: DocumentChunk[],
): RetrievedDocument[] {
  const queryTerms = getTerms(question);
  if (queryTerms.length === 0) return [];

  return chunks
    .filter((chunk) => !INJECTION_PATTERN.test(chunk.content))
    .map((chunk) => {
      const contentTerms = new Set(getTerms(chunk.content));
      const matches = queryTerms.filter((term) => contentTerms.has(term)).length;
      const similarity = matches / queryTerms.length;
      return { ...chunk, similarity };
    })
    .filter((chunk) => chunk.similarity >= LOCAL_MIN_COVERAGE)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, TOP_K);
}

function getTerms(text: string): string[] {
  return [...new Set(
    text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [],
  )].filter((term) => !STOP_WORDS.has(term));
}
