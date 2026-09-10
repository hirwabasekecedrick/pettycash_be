import { Router } from 'express';
import { authenticateToken, requireAccountant } from '../middleware/auth';
import {
  createCollection,
  getCollections,
  refreshCollectionStatus,
} from '../controllers/collections';

const router = Router();

router.use(authenticateToken as any, requireAccountant as any);

router.get('/', getCollections as any);
router.post('/', createCollection as any);
router.post('/:id/status', refreshCollectionStatus as any);

export default router;