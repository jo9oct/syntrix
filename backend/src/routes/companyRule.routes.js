// STATUS: CREATED

import {
  Router,
} from 'express';

import Joi from 'joi';

import {
  requireAuthorization,
  requireOwner,
} from '../middleware/authorization.middleware.js';

import {
  validate,
} from '../middleware/validation.middleware.js';

import {
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
} from '../controllers/companyRule.controller.js';

const router =
  Router();

const ruleSchema =
  Joi.object({
    name:
      Joi.string()
        .trim()
        .min(1)
        .max(256)
        .required(),

    category:
      Joi.string()
        .valid(
          'cors',
          'transport',
          'authentication',
          'authorization',
          'security-headers',
          'csrf',
          'session',
          'api-security',
          'general',
        )
        .required(),

    description:
      Joi.string()
        .trim()
        .min(1)
        .max(2000)
        .required(),

    severity:
      Joi.string()
        .valid(
          'critical',
          'high',
          'medium',
          'low',
          'info',
        )
        .default('medium'),

    rule:
      Joi.object()
        .required(),

    enabled:
      Joi.boolean()
        .default(true),
  });

const updateRuleSchema =
  Joi.object({
    name:
      Joi.string()
        .trim()
        .min(1)
        .max(256),

    category:
      Joi.string()
        .valid(
          'cors',
          'transport',
          'authentication',
          'authorization',
          'security-headers',
          'csrf',
          'session',
          'api-security',
          'general',
        ),

    description:
      Joi.string()
        .trim()
        .min(1)
        .max(2000),

    severity:
      Joi.string()
        .valid(
          'critical',
          'high',
          'medium',
          'low',
          'info',
        ),

    rule:
      Joi.object(),

    enabled:
      Joi.boolean(),
  }).min(1);

const ruleParamsSchema =
  Joi.object({
    ruleId:
      Joi.string()
        .hex()
        .length(24)
        .required(),
  });

const listQuerySchema =
  Joi.object({
    category:
      Joi.string()
        .valid(
          'cors',
          'transport',
          'authentication',
          'authorization',
          'security-headers',
          'csrf',
          'session',
          'api-security',
          'general',
        ),

    enabled:
      Joi.boolean(),

    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(50),

    skip:
      Joi.number()
        .integer()
        .min(0)
        .default(0),
  });

router.use(
  requireAuthorization,
  requireOwner,
);

router.post(
  '/',
  validate(
    ruleSchema,
    'body',
  ),
  createRule,
);

router.get(
  '/',
  validate(
    listQuerySchema,
    'query',
  ),
  listRules,
);

router.get(
  '/:ruleId',
  validate(
    ruleParamsSchema,
    'params',
  ),
  getRule,
);

router.patch(
  '/:ruleId',
  validate(
    ruleParamsSchema,
    'params',
  ),
  validate(
    updateRuleSchema,
    'body',
  ),
  updateRule,
);

router.delete(
  '/:ruleId',
  validate(
    ruleParamsSchema,
    'params',
  ),
  deleteRule,
);

export default router;