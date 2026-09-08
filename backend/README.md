# GYMMIS Backend

GYMMIS is a Node.js and Express API for gym management, including members,
memberships, attendance, payments, expenses, trainers, notifications, reports,
and JWT-based role access control.

## Tech stack

- Node.js and TypeScript
- Express
- PostgreSQL and Prisma ORM
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- In-memory rate limiting (`express-rate-limit`)
- QR-code generation

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL

No Node version is defined in `package.json`, and no `.nvmrc` exists.

## Setup

```bash
npm install
# Windows
copy .env.example .env
# Linux/macOS: cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Set a valid PostgreSQL `DATABASE_URL` and JWT values in `.env` before syncing
the database.

The API listens on the configured `PORT`, defaulting to `5000`.

## Structure

```text
backend/
├── prisma/          # Prisma schema and seed data
└── src/
    ├── config/      # Database and cache configuration
    ├── controllers/ # API request handlers
    ├── middlewares/ # Authentication, auditing, and errors
    ├── routes/      # Express route definitions
    ├── services/    # Notifications and lifecycle scheduling
    ├── types/       # Shared types and constants
    ├── utils/       # Token and secret utilities
    └── server.ts    # Express application entry point
```



