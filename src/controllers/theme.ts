import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getTheme = async (req: Request, res: Response): Promise<void> => {
  try {
    let tenantId;
    const userId = (req as any).user?.id;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tenantId = user?.tenantId;
    }
    
    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst();
      if (firstTenant) {
        tenantId = firstTenant.id;
      } else {
        res.json(null);
        return;
      }
    }

    const theme = await prisma.theme.findUnique({
      where: { tenantId }
    });

    res.json(theme);
  } catch (error) {
    console.error('Get theme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTheme = async (req: Request, res: Response): Promise<void> => {
  try {
    let tenantId = (req as any).user?.tenantId;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst();
      if (!firstTenant) {
         res.status(400).json({ error: 'No tenant found.' });
         return;
      }
      tenantId = firstTenant.id;
    }

    const {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      successColor,
      warningColor,
      errorColor
    } = req.body;

    const theme = await prisma.theme.upsert({
      where: { tenantId },
      update: {
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        successColor,
        warningColor,
        errorColor
      },
      create: {
        tenantId,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        successColor,
        warningColor,
        errorColor
      }
    });

    res.json(theme);
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
