import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, role } = req.user!;
    
    let totalAssigned = 0;
    let totalSpent = 0;

    if (role === 'ACCOUNTANT') {
      const assignments = await prisma.petitCashAssignment.aggregate({
        _sum: { amount: true }
      });
      const payments = await prisma.payment.aggregate({
        _sum: { amount: true }
      });

      totalAssigned = assignments._sum.amount || 0;
      totalSpent = payments._sum.amount || 0;
    } else {
      const assignments = await prisma.petitCashAssignment.aggregate({
        where: { assignedToId: id },
        _sum: { amount: true }
      });
      const payments = await prisma.payment.aggregate({
        where: { employeeId: id },
        _sum: { amount: true }
      });

      totalAssigned = assignments._sum.amount || 0;
      totalSpent = payments._sum.amount || 0;
    }

    res.json({
      totalAssigned,
      totalSpent,
      remaining: totalAssigned - totalSpent
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
