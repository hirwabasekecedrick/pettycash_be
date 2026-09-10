import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { getWalletBalance, isConfigured } from '../services/xentriPay';

async function getOrCreateWallet() {
  let wallet = await prisma.wallet.findFirst();
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: {} });
  }
  return wallet;
}

export const getUserWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ACCOUNTANT') {
      res.status(403).json({ error: 'Only accountants can manage the wallet' });
      return;
    }

    const wallet = await getOrCreateWallet();

    res.json({
      id: wallet.id,
      currency: wallet.currency,
      balance: wallet.balance,
      liveBalance: null,
      payoutMode: wallet.payoutMode,
      providerConfigured: isConfigured(),
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
};

export const updateWalletSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ACCOUNTANT') {
      res.status(403).json({ error: 'Only accountants can manage the wallet' });
      return;
    }

    const { payoutMode } = req.body;
    if (payoutMode !== 'AUTO' && payoutMode !== 'MANUAL') {
      res.status(400).json({ error: 'payoutMode must be AUTO or MANUAL' });
      return;
    }

    const wallet = await getOrCreateWallet();
    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { payoutMode }
    });

    res.json({
      id: updated.id,
      payoutMode: updated.payoutMode,
    });
  } catch (error) {
    console.error('Error updating wallet settings:', error);
    res.status(500).json({ error: 'Failed to update wallet settings' });
  }
};

export const refreshWalletBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ACCOUNTANT') {
      res.status(403).json({ error: 'Only accountants can manage the wallet' });
      return;
    }

    const wallet = await getOrCreateWallet();

    if (!isConfigured()) {
      res.status(200).json({
        ...wallet,
        liveBalance: null,
        providerConfigured: false,
        message: 'XENTRI PAY not configured — showing stored balance',
      });
      return;
    }

    const data = await getWalletBalance();
    const inner = data?.data || data;
    const balance = Number(inner?.balance ?? data?.balance ?? data?.walletBalance ?? data?.amount ?? NaN);
    if (Number.isNaN(balance)) {
      res.status(502).json({ error: 'Could not read balance from XENTRI PAY' });
      return;
    }

    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance, updatedAt: new Date() }
    });

    res.json({
      id: updated.id,
      balance: updated.balance,
      currency: updated.currency,
      payoutMode: updated.payoutMode,
      liveBalance: balance,
      providerConfigured: true,
    });
  } catch (error: any) {
    console.error('Error refreshing wallet balance:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh wallet balance' });
  }
};

export const creditWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ACCOUNTANT') {
      res.status(403).json({ error: 'Only accountants can manage the wallet' });
      return;
    }

    const amount = Number(req.body.amount);
    const note = String(req.body.note || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' });
      return;
    }

    const wallet = await getOrCreateWallet();
    const reference = `TOPUP-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

    const [updated, transaction] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount }, updatedAt: new Date() }
      }),
      prisma.walletTransaction.create({
        data: {
          type: 'CREDIT',
          amount,
          description: note || 'Wallet top-up',
          reference,
          walletId: wallet.id,
        }
      }),
    ]);

    res.status(201).json({
      balance: updated.balance,
      currency: updated.currency,
      transaction,
    });
  } catch (error) {
    console.error('Error crediting wallet:', error);
    res.status(500).json({ error: 'Failed to credit wallet' });
  }
};

export const getWalletLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ACCOUNTANT') {
      res.status(403).json({ error: 'Only accountants can view the wallet' });
      return;
    }

    const wallet = await getOrCreateWallet();
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching wallet ledger:', error);
    res.status(500).json({ error: 'Failed to fetch wallet ledger' });
  }
};