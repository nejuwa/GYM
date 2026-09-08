import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { AccountStatus } from '../types';

export const getPackages = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status as string;

    const packages = await prisma.package.findMany({
      where,
      include: {
        _count: { select: { memberships: true } },
      },
      orderBy: { price: 'asc' },
    });

    res.json({ success: true, count: packages.length, packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
};

export const getPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        memberships: {
          take: 10,
          include: { member: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.json({ success: true, package: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch package' });
  }
};

export const createPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, durationDays, price, features, status } = req.body;

    if (!name || !durationDays || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name, duration (days), and price are required' });
    }

    const existing = await prisma.package.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A package with this name already exists' });
    }

    const newPackage = await prisma.package.create({
      data: {
        name,
        description: description || null,
        durationDays: Number(durationDays),
        price: Number(price),
        features: typeof features === 'object' ? JSON.stringify(features) : features,
        status: status || AccountStatus.ACTIVE,
      },
    });

    createAuditEntry(req, 'CREATE_PACKAGE', 'PACKAGES', `Created package ${name} (${durationDays} days, $${price})`);

    res.status(201).json({ success: true, message: 'Package created successfully', package: newPackage });
  } catch (error: any) {
    console.error('Create package error:', error);
    res.status(500).json({ success: false, message: 'Failed to create package' });
  }
};

export const updatePackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, durationDays, price, features, status } = req.body;

    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        durationDays: durationDays !== undefined ? Number(durationDays) : existing.durationDays,
        price: price !== undefined ? Number(price) : existing.price,
        features: features !== undefined ? (typeof features === 'object' ? JSON.stringify(features) : features) : existing.features,
        status: status ?? existing.status,
      },
    });

    createAuditEntry(req, 'UPDATE_PACKAGE', 'PACKAGES', `Updated package ${updated.name}`);

    res.json({ success: true, message: 'Package updated successfully', package: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
};
