import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { chunkText } from './chunker';
import { embedTexts } from './embedder';
import { replaceDocumentIndex } from './vectorStore';
import type { DocumentChunk } from './types';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

function dataDirectory(): string {
  return path.resolve(process.cwd(), process.env.RAG_DATA_DIR || 'data');
}

async function extractPages(buffer: Buffer, extension: string): Promise<{ page: number; text: string }[]> {
  if (extension === '.pdf') {
    const pages: string[] = [];
    await pdfParse(buffer, {
      pagerender: async (pageData) => {
        const content = await pageData.getTextContent();
        pages.push(content.items.map((item: { str?: string }) => item.str || '').join(' '));
        return '';
      },
    });
    return pages.map((text, index) => ({ page: index + 1, text }));
  }

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return [{ page: 1, text: result.value }];
  }

  return [{ page: 1, text: buffer.toString('utf8') }];
}

export async function indexGymDescription(
  fileName: string,
  buffer: Buffer,
): Promise<{ indexedChunks: number }> {
  const extension = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error('Upload a PDF, DOCX, TXT, or MD gym description file.');
  }

  const pages = await extractPages(buffer, extension);
  const chunks: DocumentChunk[] = pages.flatMap(({ page, text }) =>
    chunkText(text, path.basename(fileName), page),
  );
  if (chunks.length === 0) {
    throw new Error('The gym description file contains no readable text.');
  }

  const safeChunks = chunks.filter((chunk) => !containsPromptInjection(chunk.content));
  if (safeChunks.length === 0) {
    throw new Error('No safe text could be indexed from the uploaded file.');
  }
  const embeddings = await embedTexts(safeChunks.map((chunk) => chunk.content));
  safeChunks.forEach((chunk, index) => {
    chunk.embedding = embeddings[index];
  });

  await replaceDocumentIndex(safeChunks);
  return { indexedChunks: safeChunks.length };
}

export async function reindexGymDescription(): Promise<{ file: string; indexedChunks: number }> {
  const directory = dataDirectory();
  let files: string[];
  try {
    files = await fs.readdir(directory);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new Error('No gym description file was found in the configured data directory.');
    }
    throw error;
  }
  const fileName = files.find((name) =>
    name.startsWith('gym_description.')
      && ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()),
  );
  if (!fileName) {
    throw new Error('No gym description file was found in the configured data directory.');
  }

  const buffer = await fs.readFile(path.join(directory, fileName));
  const result = await indexGymDescription(fileName, buffer);
  return { file: fileName, ...result };
}

export async function loadGymDescriptionChunks(): Promise<DocumentChunk[]> {
  const directory = dataDirectory();
  let files: string[];
  try {
    files = await fs.readdir(directory);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }

  const fileName = files.find((name) =>
    name.startsWith('gym_description.')
      && ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()),
  );
  if (!fileName) return [];

  const buffer = await fs.readFile(path.join(directory, fileName));
  const pages = await extractPages(buffer, path.extname(fileName).toLowerCase());
  return pages.flatMap(({ page, text }) =>
    chunkText(text, path.basename(fileName), page)
      .filter((chunk) => !containsPromptInjection(chunk.content)),
  );
}

export function isSupportedDescriptionFile(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function containsPromptInjection(content: string): boolean {
  return /\b(ignore|disregard|override)\b.{0,80}\b(previous|above|system|developer|instructions?|prompt)\b|\b(reveal|print|show)\b.{0,50}\b(system prompt|developer message|secret instructions)\b/i
    .test(content);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
