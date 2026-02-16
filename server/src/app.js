import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import examRoutes from './routes/examRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = new Set(env.clientUrls || []);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      if (env.nodeEnv !== 'production') {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/home', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);
app.get('/', (req, res) => res.json({ message: 'Welcome to the Exam Portal API' }));
export default app;
