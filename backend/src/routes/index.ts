import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './projects.routes';
import findingRoutes from './findings.routes';
import malwareRoutes from './malware.routes';
import assessmentRoutes from './assessment.routes';
import paymentRoutes from './payment.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sentrix-cybersecurity-platform-api',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      projects: '/api/projects',
      findings: '/api/findings',
      malware: '/api/malware',
      assessments: '/api/assessments',
      payment: '/api/payment'
    }
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/findings', findingRoutes);
router.use('/malware', malwareRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/payment', paymentRoutes);

export default router;
