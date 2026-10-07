// STATUS: CREATED

import {
  getOwnerId,
} from '../middleware/authorization.middleware.js';

import * as companyRuleService
  from '../services/companyRule.service.js';

const createRule = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const rule =
      await companyRuleService.createRule({
        ownerId,
        data: req.body,
      });

    return res
      .status(201)
      .json({
        success: true,

        data: {
          rule,
        },
      });
  } catch (error) {
    return next(error);
  }
};

const getRule = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const rule =
      await companyRuleService.getRule({
        ownerId,
        ruleId:
          req.params.ruleId,
      });

    return res
      .status(200)
      .json({
        success: true,

        data: {
          rule,
        },
      });
  } catch (error) {
    return next(error);
  }
};

const listRules = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const rules =
      await companyRuleService.listRules({
        ownerId,
        options: {
          category:
            req.query.category,

          enabled:
            req.query.enabled,

          limit:
            req.query.limit,

          skip:
            req.query.skip,
        },
      });

    return res
      .status(200)
      .json({
        success: true,

        data: {
          rules,
          count:
            rules.length,
        },
      });
  } catch (error) {
    return next(error);
  }
};

const updateRule = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const rule =
      await companyRuleService.updateRule({
        ownerId,

        ruleId:
          req.params.ruleId,

        data:
          req.body,
      });

    return res
      .status(200)
      .json({
        success: true,

        data: {
          rule,
        },
      });
  } catch (error) {
    return next(error);
  }
};

const deleteRule = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const result =
      await companyRuleService.deleteRule({
        ownerId,

        ruleId:
          req.params.ruleId,
      });

    return res
      .status(200)
      .json({
        success: true,

        data: result,
      });
  } catch (error) {
    return next(error);
  }
};

export {
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
};