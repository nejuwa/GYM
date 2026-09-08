/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  Role,
  AccountStatus,
  ExpenseCategory,
  PaymentMethod,
} from '../src/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting GYMMIS database seeding for Chagni Gym...');

  // Wipe all tables in dependency order (safe to re-run)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.trainerAssignment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.member.deleteMany();
  await prisma.package.deleteMany();
  await prisma.user.deleteMany();

  // ── 1. Owner account (the only system user) ───────────────────────────────
  const ownerPasswordHash = await bcrypt.hash('admin123', 10);

  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@gymmis.com',
      username: 'owner',
      passwordHash: ownerPasswordHash,
      fullName: 'Abebe Bikila',
      role: Role.OWNER,
      status: AccountStatus.ACTIVE,
      phone: '+251 911 112 233',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
  });

  await prisma.trainer.create({
    data: {
      userId: null,
      fullName: 'Trainer Abdu',
      phone: '+251 915 990 011',
      email: 'trainer@gymmis.com',
      specialization: 'Mobility, Yoga & Functional Core',
      bio: '500-hr RYT yoga instructor and mobility specialist focusing on longevity and flexibility.',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      status: AccountStatus.ACTIVE,
    },
  });

  await prisma.package.create({
    data: {
      name: 'Elite VIP Annual',
      description: '365-day all-inclusive VIP pass with 24/7 access, dedicated trainer & nutrition plan.',
      durationDays: 365,
      price: 420,
      features: JSON.stringify(['24/7 VIP Access', 'Personal Trainer Assignment', 'Custom Nutrition Plan', 'VIP Locker & Towel Service', 'Free Guest Passes']),
      status: AccountStatus.ACTIVE,
    },
  });

  // ── 4. System initialization audit log ────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      userId: ownerUser.id,
      userName: ownerUser.fullName,
      role: ownerUser.role,
      action: 'SYSTEM_INITIALIZATION',
      module: 'SYSTEM',
      details: 'GYMMIS initialized — owner account and base configuration created.',
      result: 'SUCCESS',
    },
  });

  // ── 5. Welcome broadcast notification ─────────────────────────────────────
  await prisma.notification.create({
    data: {
      recipientId: null, // Broadcast to all users
      title: '🏋️ Welcome to GYMMIS — Chagni Gym',
      message: 'The gym management system is now live. Add your staff, members, and packages to get started.',
      type: 'ANNOUNCEMENT' as any,
    },
  });

  console.log('');
  console.log('✅ Seeding completed successfully!');
  console.log('  Owner: owner@gymmis.com  |  password: admin123');
  console.log('====================================================');
  console.log('  Packages created : 3');
  console.log('  Trainers created : 2 (staff records, no login)');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
