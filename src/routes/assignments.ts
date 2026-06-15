import { Router } from 'express';
import { createAssignment, getAssignments } from '../controllers/assignments';
import { authenticateToken, requireAccountant } from '../middleware/auth';

const router = Router();

router.use(authenticateToken as any);

// Both can view (Accountants see all, Employees see their own)
router.get('/', getAssignments as any);

// Only accountants can assign cash
router.post('/', requireAccountant as any, createAssignment as any);

export default router;
