import { Router } from 'express';
import { getProjects, createProject, getProject, updateProject, deleteProject } from '../controllers/projects.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
  .get(getProjects)
  .post(authorize('admin', 'client_owner', 'security_engineer'), createProject);

router.route('/:id')
  .get(getProject)
  .put(authorize('admin', 'client_owner', 'security_engineer'), updateProject)
  .delete(authorize('admin', 'client_owner'), deleteProject);

export default router;
