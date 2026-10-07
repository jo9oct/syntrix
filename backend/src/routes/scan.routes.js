// STATUS: UPDATED

import {
  Router,
} from 'express';

import {
  cancelScan,
  createScan,
  getScan,
} from '../controllers/scan.controller.js';

import {
  requireAuthorization,
  requireOwner,
} from '../middleware/authorization.middleware.js';

import {
  validate,
} from '../middleware/validation.middleware.js';

import {
  createScanSchema,
  scanIdSchema,
} from '../validators/scan.validator.js';

const router =
  Router();

router.post(
  '/',
  requireAuthorization,
  requireOwner,
  validate(
    createScanSchema,
    'body',
  ),
  createScan,
);

router.get(
  '/:scanId',
  requireAuthorization,
  requireOwner,
  validate(
    scanIdSchema,
    'params',
  ),
  getScan,
);

router.post(
  '/:scanId/cancel',
  requireAuthorization,
  requireOwner,
  validate(
    scanIdSchema,
    'params',
  ),
  cancelScan,
);

export default router;