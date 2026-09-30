import { Router } from 'express';
import { getUsers, createUser, toggleUserStatus } from '../controllers/admin.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/users')
  .get(getUsers)
  .post(createUser);

router.route('/users/:id/status')
  .put(toggleUserStatus);

export default router;
