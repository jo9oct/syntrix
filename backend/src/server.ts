import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());

// Root & Health routes
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Sentrix Cybersecurity Platform API is operational.',
    version: '1.0.0',
    apiRoot: '/api',
    health: '/api/health'
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sentrix-cybersecurity-platform-api',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      projects: '/api/projects',
      findings: '/api/findings',
      malware: '/api/malware',
      assessments: '/api/assessments'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'sentrix-api' });
});

import routes from './routes';

// Use routes
app.use('/api', routes);
app.use('/api/v1', routes);

// Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] API running on http://localhost:${PORT}`);
  });
};

startServer();
