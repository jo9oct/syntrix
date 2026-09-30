import { Router } from 'express';
import { getFindings, createFinding, getFinding, updateFinding } from '../controllers/findings.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
  .get(getFindings)
  .post(authorize('admin', 'security_engineer'), createFinding);

router.route('/:id')
  .get(getFinding)
  .put(authorize('admin', 'client_owner', 'security_engineer', 'developer'), updateFinding);

export default router;

