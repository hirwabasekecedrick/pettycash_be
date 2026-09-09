import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createBudgetItem, getBudgetItems } from '../controllers/budgetItems';

const router = Router();

router.use(authenticateToken as any);
router.get('/', getBudgetItems as any);
router.post('/', createBudgetItem as any);

export default router;
