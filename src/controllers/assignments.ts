import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const createAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, assignedToId, authorizedItems } = req.body;
    const assignedById = req.user!.id; // from auth middleware

    const assignment = await prisma.petitCashAssignment.create({
      data: {
        amount: Number(amount),
        assignedToId: assignedToId,
        assignedById,
        authorizedItems: {
          connectOrCreate: (authorizedItems as string[] || []).map(name => ({
            where: { name },
            create: { name }
          }))
        }
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
        authorizedItems: true
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to assign cash' });
  }
};

export const getAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, role } = req.user!;
    
    // If accountant, view all. If employee, view own.
    const whereClause = role === 'ACCOUNTANT' ? {} : { assignedToId: id };

    const assignments = await prisma.petitCashAssignment.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { name: true, email: true } },
        assignedBy: { select: { name: true } },
        authorizedItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};
