import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getUserWallet,
  updateWalletSettings,
  refreshWalletBalance,
  creditWallet,
  getWalletLedger,
} from '../controllers/wallet';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getUserWallet as any);
router.put('/', updateWalletSettings as any);
router.post('/refresh', refreshWalletBalance as any);
router.post('/credit', creditWallet as any);
router.get('/transactions', getWalletLedger as any);

export default router;