import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken as any);
router.get('/', getDashboardStats as any);

export default router;
