import express from 'express';
import { getTheme, updateTheme } from '../controllers/theme';
import { authenticateToken, requireAccountant } from '../middleware/auth';

const router = express.Router();

router.get('/', getTheme);

router.put('/', authenticateToken, requireAccountant, updateTheme);

export default router;
