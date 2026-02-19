import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';
import walletRoutes from './routes/wallet.js';
import dashboardRoutes from './routes/dashboard.js';
import { supabase } from './lib/supabase.js';
import { startCronScheduler } from './services/cron.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase connection
    const { error } = await supabase.from('users').select('count').limit(1);
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: error ? 'error' : 'connected'
    });
  } catch (e) {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'unknown' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 IRLwork API running on port ${PORT}`);
  console.log(`📍 Database: ${process.env.SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'}`);
  
  // Start cron scheduler for auto-release and pending→available promotion
  startCronScheduler();
});

export { app };
