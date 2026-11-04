import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import prisma from '../config/db';
import { answerGymQuestion, clearAnswerCache } from '../rag/chain';
import { indexGymDescription, isSupportedDescriptionFile, reindexGymDescription } from '../rag/documentIngestion';
import { classifyQuestion } from '../rag/router';
import { getDocumentIndexHealth } from '../rag/vectorStore';

const NO_INFORMATION_ANSWER = "I don't have that information in the gym's records.";

export async function chat(req: AuthRequest, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'A message between 1 and 1000 characters is required.',
    });
  }
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const route = classifyQuestion(message);
  try {
    const result = await answerGymQuestion(message.trim(), {
      id: req.user.id,
      role: req.user.role,
    });
    console.info(JSON.stringify({
      event: 'rag.chat',
      role: req.user.role,
      route: result.route,
      latencyMs: Date.now() - startedAt,
      sourceTypes: [...new Set(result.sources.map((source) => source.type))],
    }));
    return res.json({
      success: true,
      answer: result.answer || NO_INFORMATION_ANSWER,
      sources: result.sources,
      confidence: result.confidence,
      route,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'rag.chat.error',
      role: req.user.role,
      route,
      latencyMs: Date.now() - startedAt,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    }));
    return next(error);
  }
}

export async function uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'Upload a gym description file.' });
  }
  if (!isSupportedDescriptionFile(file.originalname)) {
    return res.status(400).json({ success: false, message: 'Supported files are PDF, DOCX, TXT, and MD.' });
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const fileName = `gym_description${extension}`;
  const dataDirectory = path.resolve(process.cwd(), process.env.RAG_DATA_DIR || 'data');
  const temporaryPath = path.join(dataDirectory, `.gym_description-${randomUUID()}.tmp`);
  try {
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.writeFile(temporaryPath, file.buffer, { flag: 'wx' });
    const oldFiles = (await fs.readdir(dataDirectory)).filter((name) =>
      name.startsWith('gym_description.')
      && isSupportedDescriptionFile(name),
    );
    const backups: { original: string; backup: string }[] = [];
    let destinationInstalled = false;
    try {
      for (const name of oldFiles) {
        const original = path.join(dataDirectory, name);
        const backup = path.join(dataDirectory, `.rag-upload-${randomUUID()}.backup`);
        await fs.rename(original, backup);
        backups.push({ original, backup });
      }
      const destination = path.join(dataDirectory, fileName);
      await fs.rename(temporaryPath, destination);
      destinationInstalled = true;
      const result = await indexGymDescription(fileName, file.buffer);
      for (const { backup } of backups) {
        await fs.rm(backup, { force: true }).catch((cleanupError) => {
          console.error(JSON.stringify({
            event: 'rag.upload.backup-cleanup.error',
            errorType: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
          }));
        });
      }
      clearAnswerCache();
      return res.json({ success: true, file: fileName, ...result });
    } catch (error) {
      if (destinationInstalled) {
        await fs.rm(path.join(dataDirectory, fileName), { force: true }).catch((cleanupError) => {
          console.error(JSON.stringify({
            event: 'rag.upload.rollback.error',
            errorType: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
          }));
        });
      }
      await Promise.all(backups.map(async ({ original, backup }) => {
        try {
          await fs.access(backup);
          await fs.rename(backup, original);
        } catch (restoreError) {
          console.error(JSON.stringify({
            event: 'rag.upload.restore.error',
            errorType: restoreError instanceof Error ? restoreError.name : 'UnknownError',
          }));
        }
      }));
      throw error;
    }
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch((cleanupError) => {
      console.error(JSON.stringify({
        event: 'rag.upload.cleanup.error',
        errorType: cleanupError instanceof Error ? cleanupError.name : 'UnknownError',
      }));
    });
    return next(error);
  }
}

export async function reindex(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await reindexGymDescription();
    clearAnswerCache();
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function adminHealth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [database, vector] = await Promise.all([
      prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`,
      getDocumentIndexHealth(),
    ]);
    return res.json({
      success: true,
      database: database.length > 0,
      indexedChunks: vector.indexedChunks,
      ready: database.length > 0 && vector.indexedChunks > 0,
    });
  } catch (error) {
    return next(error);
  }
}
