import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getBudgetItems } from '../controllers/budgetItems';

const router = Router();

router.use(authenticateToken as any);
router.get('/', getBudgetItems as any);

export default router;
