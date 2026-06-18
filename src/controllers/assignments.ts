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
    const mineOnly = req.query.mine === 'true';
    const month = req.query.month as string;

    // ?mine=true  → always filter to the caller's own assignments (used by payments page)
    // ACCOUNTANT without ?mine → see all assignments
    // EMPLOYEE (any) → always see only their own
    const whereClause: any =
      mineOnly || role !== 'ACCOUNTANT'
        ? { assignedToId: id }
        : {};

    let assignments = await prisma.petitCashAssignment.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { name: true, email: true } },
        assignedBy: { select: { name: true } },
        authorizedItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Apply month filter in JS (PrismaPg v7 adapter silently drops Date objects in where clauses)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split('-');
      const startOfMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
      const endOfMonth   = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));
      assignments = assignments.filter(a => {
        const created = new Date(a.createdAt);
        return created >= startOfMonth && created < endOfMonth;
      });
    }

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};
