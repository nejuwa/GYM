import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import prisma from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { startMembershipLifecycleScheduler } from './services/membershipLifecycleService';
import path from 'node:path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const validateProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must use a PostgreSQL connection string in production.');
  }

  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production.');
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '';
  if (!/^\d+[smhd]$/.test(jwtExpiresIn) && jwtExpiresIn !== '7d') {
    throw new Error('JWT_EXPIRES_IN must be a valid duration string such as 7d, 24h, or 3600s.');
  }
};

validateProductionConfig();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or allowed origins
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev
      }
    },
    credentials: true,
  })
);

// Rate Limiting (High throughput friendly for gym kiosks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Body Parsing & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount Master API
app.use('/api', apiRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      service: 'GYMMIS Core API (Chagni Gym)',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: Array.isArray(dbHealth) && dbHealth.length > 0,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'GYMMIS Core API (Chagni Gym)',
      environment: process.env.NODE_ENV || 'development',
      database: { connected: false },
      message: error?.message || 'Database health check failed',
    });
  }
});

// Root Welcome
app.get('/', (req, res) => {
  res.json({
    message: '🏋️‍♂️ Welcome to GYMMIS - Gym Management Information System API',
    documentation: '/api/health',
    status: 'Operational',
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 GYMMIS Server is running on http://localhost:${PORT}`);
  console.log(`📡 API Endpoints available at http://localhost:${PORT}/api`);
  console.log(`🛡️  Role-Based Access Control: [OWNER, MANAGER, TRAINER, MEMBER]`);
  console.log(`====================================================`);
  startMembershipLifecycleScheduler();
});

export default app;
