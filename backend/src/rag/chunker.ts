import { createHash } from 'node:crypto';
import type { DocumentChunk } from './types';

const CHARS_PER_TOKEN = 4;
const DEFAULT_CHUNK_TOKENS = 700;
const DEFAULT_OVERLAP_TOKENS = 100;

function findBoundary(text: string, start: number, target: number): number {
  const minimum = start + Math.floor((target - start) * 0.6);
  for (const separator of ['\n\n', '\n', '. ', ' ']) {
    const position = text.lastIndexOf(separator, target);
    if (position >= minimum) return position + separator.length;
  }
  return target;
}

export function chunkText(
  text: string,
  source: string,
  page: number,
  chunkTokens = DEFAULT_CHUNK_TOKENS,
  overlapTokens = DEFAULT_OVERLAP_TOKENS,
): DocumentChunk[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunkSize = chunkTokens * CHARS_PER_TOKEN;
  const overlap = overlapTokens * CHARS_PER_TOKEN;
  const chunks: DocumentChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + chunkSize, normalized.length);
    const end = hardEnd < normalized.length
      ? findBoundary(normalized, start, hardEnd)
      : hardEnd;
    const content = normalized.slice(start, end).trim();
    if (content) {
      const digest = createHash('sha256')
        .update(`${source}:${page}:${start}:${content}`)
        .digest('hex')
        .slice(0, 24);
      chunks.push({ id: digest, source, page, content });
    }

    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}
