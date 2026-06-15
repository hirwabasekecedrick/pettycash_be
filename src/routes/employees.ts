import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employees';
import { authenticateToken, requireAccountant } from '../middleware/auth';

const router = Router();

// Only accountants can manage employees
router.use(authenticateToken as any, requireAccountant as any);

router.get('/', getEmployees as any);
router.post('/', createEmployee as any);
router.put('/:id', updateEmployee as any);
router.delete('/:id', deleteEmployee as any);

export default router;
