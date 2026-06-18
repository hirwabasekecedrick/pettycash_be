import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
    const { id, role } = req.user!;
    const month = req.query.month as string;

    // Parse month filter boundaries in JS
    let startOfMonth: Date | null = null;
    let endOfMonth: Date | null = null;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split('-');
      startOfMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
      endOfMonth   = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));
    }

    const inRange = (date: Date) => {
      if (!startOfMonth || !endOfMonth) return true;
      const d = new Date(date);
      return d >= startOfMonth && d < endOfMonth;
    };

    let totalAssigned = 0;
    let totalSpent = 0;

    if (role === 'ACCOUNTANT') {
      const allAssignments = await prisma.petitCashAssignment.findMany({ select: { amount: true, createdAt: true } });
      const allPayments = await prisma.payment.findMany({ select: { amount: true, createdAt: true } });
      totalAssigned = allAssignments.filter(a => inRange(a.createdAt)).reduce((s, a) => s + a.amount, 0);
      totalSpent    = allPayments.filter(p => inRange(p.createdAt)).reduce((s, p) => s + p.amount, 0);
    } else {
      const allAssignments = await prisma.petitCashAssignment.findMany({ where: { assignedToId: id }, select: { amount: true, createdAt: true } });
      const allPayments = await prisma.payment.findMany({ where: { employeeId: id }, select: { amount: true, createdAt: true } });
      totalAssigned = allAssignments.filter(a => inRange(a.createdAt)).reduce((s, a) => s + a.amount, 0);
      totalSpent    = allPayments.filter(p => inRange(p.createdAt)).reduce((s, p) => s + p.amount, 0);
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
