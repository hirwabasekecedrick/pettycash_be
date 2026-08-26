import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import assignmentRoutes from './routes/assignments';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';
import budgetItemRoutes from './routes/budgetItems';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Security middlewares
app.use(helmet());

// Rate Limiting (e.g., 100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budget-items', budgetItemRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('Petty Cash API running');
});

const PORT = process.env.PORT || 6002;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});