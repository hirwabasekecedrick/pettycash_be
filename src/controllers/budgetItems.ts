import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getBudgetItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const budgetItems = await prisma.budgetItem.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(budgetItems);
  } catch (error) {
    console.error('Error fetching budget items:', error);
    res.status(500).json({ error: 'Failed to fetch budget items' });
  }
};
