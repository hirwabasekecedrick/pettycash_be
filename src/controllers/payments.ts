import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const submitPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vendorNumber, amount, reason } = req.body;
    const employeeId = req.user!.id;
    
    const files = req.files as Express.Multer.File[];
    const images = files ? files.map(file => `/uploads/${file.filename}`) : [];

    const paymentAmount = Number(amount);

    // Check balance
    const assignments = await prisma.petitCashAssignment.aggregate({
      where: { assignedToId: employeeId },
      _sum: { amount: true }
    });
    const totalAssigned = assignments._sum.amount || 0;

    const existingPayments = await prisma.payment.aggregate({
      where: { employeeId: employeeId },
      _sum: { amount: true }
    });
    const totalSpent = existingPayments._sum.amount || 0;

    if (totalAssigned - totalSpent < paymentAmount) {
      res.status(400).json({ error: 'Insufficient balance to make this payment.' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        vendorNumber,
        amount: paymentAmount,
        reason,
        images,
        employeeId
      },
      include: {
        employee: { select: { name: true, email: true } }
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
    
    const whereClause = role === 'ACCOUNTANT' ? {} : { employeeId: id };

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
