import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import assignmentRoutes from './routes/assignments';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('Petty Cash API running');
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});