import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const submitPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vendorNumber, amount, reason, assignmentId, budgetItemName } = req.body;
    const employeeId = req.user!.id;
    const idempotencyKey = req.header('Idempotency-Key');

    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey }
      });
      if (existingPayment) {
        res.status(200).json(existingPayment);
        return;
      }
    }

    if (!assignmentId) {
      res.status(400).json({ error: 'assignmentId is required' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const images = files ? files.map(file => `/uploads/${file.filename}`) : [];

    const paymentAmount = Number(amount);

    // Get the specific assignment to check balance
    const assignment = await prisma.petitCashAssignment.findUnique({
      where: { id: Number(assignmentId) }
    });

    if (!assignment || assignment.assignedToId !== employeeId) {
      res.status(403).json({ error: 'Invalid or unauthorized assignment' });
      return;
    }

    const existingPayments = await prisma.payment.aggregate({
      where: { assignmentId: assignment.id },
      _sum: { amount: true }
    });
    const totalSpent = existingPayments._sum?.amount || 0;

    if (assignment.amount - totalSpent < paymentAmount) {
      res.status(400).json({ error: 'Insufficient balance in this allocation to make the payment.' });
      return;
    }

    let budgetItemId: number | undefined;
    if (budgetItemName && budgetItemName.trim() !== '') {
      const bItem = await prisma.budgetItem.upsert({
        where: { name: budgetItemName.trim() },
        update: {},
        create: { name: budgetItemName.trim() }
      });
      budgetItemId = bItem.id;
    }

    const paymentData: any = {
      vendorNumber,
      amount: paymentAmount,
      reason: reason || "",
      images,
      idempotencyKey,
      employeeId,
      assignmentId: assignment.id,
      ...(budgetItemId ? { budgetItemId } : {})
    };

    const payment = await prisma.payment.create({
      data: paymentData,
      include: {
        employee: { select: { name: true, email: true } },
        assignment: true,
        budgetItem: true
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, role } = req.user!;
    const month = req.query.month as string;
    
    const whereClause: any = role === 'ACCOUNTANT' ? {} : { employeeId: id };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split('-');
      const startOfMonth = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const endOfMonth = new Date(Number(yearStr), Number(monthStr), 1);
      whereClause.createdAt = {
        gte: startOfMonth,
        lt: endOfMonth
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        employee: { select: { name: true, email: true, department: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};
