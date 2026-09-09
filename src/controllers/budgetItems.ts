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

export const createBudgetItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Budget item name is required' });
      return;
    }

    const trimmed = String(name).trim();
    const existing = await prisma.budgetItem.findUnique({ where: { name: trimmed } });
    if (existing) {
      res.status(400).json({ error: 'Budget item already exists' });
      return;
    }

    const item = await prisma.budgetItem.create({ data: { name: trimmed } });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating budget item:', error);
    res.status(500).json({ error: 'Failed to create budget item' });
  }
};
