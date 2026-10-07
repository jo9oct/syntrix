// STATUS: UPDATED

import mongoose from 'mongoose';

import {
  getPlan,
} from '../access/plan.service.js';

import * as companyRuleRepository
  from '../database/repositories/companyRule.repository.js';

const assertCompanyRulesAccess = () => {
  const plan =
    getPlan();

  if (
    plan.integrations?.companyRules !==
    true
  ) {
    const error = new Error(
      'Company security rules are available only on the Enterprise plan.',
    );

    error.statusCode = 403;
    error.code =
      'FEATURE_NOT_AVAILABLE';

    throw error;
  }

  return plan;
};

const assertOwnerId = (
  ownerId,
) => {
  if (
    !mongoose.isValidObjectId(
      ownerId,
    )
  ) {
    const error = new Error(
      'Owner ID must be a valid ObjectId.',
    );

    error.statusCode = 400;
    error.code =
      'INVALID_OWNER_ID';

    throw error;
  }

  return new mongoose.Types.ObjectId(
    ownerId,
  );
};

const assertRuleId = (
  ruleId,
) => {
  if (
    !mongoose.isValidObjectId(
      ruleId,
    )
  ) {
    const error = new Error(
      'Company rule ID must be a valid ObjectId.',
    );

    error.statusCode = 400;
    error.code =
      'INVALID_COMPANY_RULE_ID';

    throw error;
  }

  return new mongoose.Types.ObjectId(
    ruleId,
  );
};

const createRule = async ({
  ownerId,
  data,
}) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId =
    assertOwnerId(ownerId);

  return companyRuleRepository.create({
    ownerId:
      normalizedOwnerId,

    ...data,
  });
};

const getRule = async ({
  ownerId,
  ruleId,
}) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId =
    assertOwnerId(ownerId);

  const normalizedRuleId =
    assertRuleId(ruleId);

  const rule =
    await companyRuleRepository.findById(
      normalizedOwnerId,
      normalizedRuleId,
    );

  if (!rule) {
    const error = new Error(
      'Company security rule was not found.',
    );

    error.statusCode = 404;
    error.code =
      'COMPANY_RULE_NOT_FOUND';

    throw error;
  }

  return rule;
};

const listRules = async ({
  ownerId,
  options = {},
}) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId =
    assertOwnerId(ownerId);

  return companyRuleRepository.list(
    normalizedOwnerId,
    options,
  );
};

const updateRule = async ({
  ownerId,
  ruleId,
  data,
}) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId =
    assertOwnerId(ownerId);

  const normalizedRuleId =
    assertRuleId(ruleId);

  const rule =
    await companyRuleRepository.update(
      normalizedOwnerId,
      normalizedRuleId,
      data,
    );

  if (!rule) {
    const error = new Error(
      'Company security rule was not found.',
    );

    error.statusCode = 404;
    error.code =
      'COMPANY_RULE_NOT_FOUND';

    throw error;
  }

  return rule;
};

const deleteRule = async ({
  ownerId,
  ruleId,
}) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId =
    assertOwnerId(ownerId);

  const normalizedRuleId =
    assertRuleId(ruleId);

  const result =
    await companyRuleRepository.deleteById(
      normalizedOwnerId,
      normalizedRuleId,
    );

  if (
    result.deletedCount === 0
  ) {
    const error = new Error(
      'Company security rule was not found.',
    );

    error.statusCode = 404;
    error.code =
      'COMPANY_RULE_NOT_FOUND';

    throw error;
  }

  return {
    deleted: true,

    ruleId:
      normalizedRuleId.toString(),
  };
};

export {
  assertCompanyRulesAccess,
  createRule,
  getRule,
  listRules,
  updateRule,
  deleteRule,
};