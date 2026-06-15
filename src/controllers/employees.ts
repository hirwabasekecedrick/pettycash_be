import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, department, role } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        department,
        role: role || 'EMPLOYEE',
      },
      select: { id: true, name: true, email: true, role: true }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, role, password } = req.body;
    
    let updateData: any = { name, email, phone, department, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, name: true, email: true, role: true }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
