import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { submitPayment, getPayments } from '../controllers/payments';
import { authenticateToken } from '../middleware/auth';

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const router = Router();

router.use(authenticateToken as any);

router.get('/', getPayments as any);

// Allow up to 5 images per payment
router.post('/', upload.array('images', 5), submitPayment as any);

export default router;
