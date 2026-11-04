import { Router } from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { adminHealth, chat, reindex, uploadFile } from '../controllers/ragController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();
const admin = [Role.OWNER, Role.MANAGER];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many assistant requests. Please try again later.' },
});
const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many assistant indexing requests. Please try again later.' },
});

const uploadFileMiddleware: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge ? 'The uploaded file must be 10 MB or smaller.' : 'Invalid upload request.',
      });
    };
    return next(error);
  });
}

router.post('/chat', authenticate, chatLimiter, chat);
router.post('/admin/upload-file', authenticate, authorize(admin), adminMutationLimiter, uploadFileMiddleware, uploadFile);
router.post('/admin/reindex', authenticate, authorize(admin), adminMutationLimiter, reindex);
router.get('/admin/health', authenticate, authorize(admin), adminHealth);

const handleRagError: ErrorRequestHandler = (error, req, res, _next) => {
  console.error(JSON.stringify({
    event: 'rag.request.error',
    path: req.path,
    errorType: error instanceof Error ? error.name : 'UnknownError',
  }));
  if (error instanceof Error && error.message === 'No gym description file was found in the configured data directory.') {
    res.status(404).json({ success: false, message: error.message });
    return;
  }
  res.status(503).json({
    success: false,
    message: 'The gym assistant is temporarily unavailable. Please try again later.',
  });
};

router.use(handleRagError);

export default router;
