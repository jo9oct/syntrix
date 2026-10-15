// STATUS: UPDATED
// File: src/services/companyRule.service.js

import mongoose from "mongoose";

import { getPlan } from "../access/plan.service.js";

import * as companyRuleRepository from "../database/repositories/companyRule.repository.js";

const assertCompanyRulesAccess = () => {
  const plan = getPlan();

  if (plan.integrations?.companyRules !== true) {
    const error = new Error(
      "Company security rules are available only on the Enterprise plan.",
    );

    error.statusCode = 403;
    error.code = "FEATURE_NOT_AVAILABLE";

    throw error;
  }

  return plan;
};

const assertOwnerId = (ownerId) => {
  if (!mongoose.isValidObjectId(ownerId)) {
    const error = new Error("Owner ID must be a valid ObjectId.");

    error.statusCode = 400;
    error.code = "INVALID_OWNER_ID";

    throw error;
  }

  return new mongoose.Types.ObjectId(ownerId);
};

const assertRuleId = (ruleId) => {
  if (!mongoose.isValidObjectId(ruleId)) {
    const error = new Error("Company rule ID must be a valid ObjectId.");

    error.statusCode = 400;
    error.code = "INVALID_COMPANY_RULE_ID";

    throw error;
  }

  return new mongoose.Types.ObjectId(ruleId);
};

const normalizeRuleName = (name) => {
  if (typeof name !== "string") {
    const error = new Error("Company rule name is required.");

    error.statusCode = 400;
    error.code = "INVALID_COMPANY_RULE_NAME";

    throw error;
  }

  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    const error = new Error("Company rule name cannot be empty.");

    error.statusCode = 400;
    error.code = "INVALID_COMPANY_RULE_NAME";

    throw error;
  }

  return normalized;
};

const prepareRuleData = (data) => {
  const prepared = { ...data };

  if (Object.hasOwn(prepared, "name")) {
    prepared.name = prepared.name.trim();
    prepared.normalizedName = normalizeRuleName(prepared.name);
  }

  // Clients must not control the normalized database key.
  if (!Object.hasOwn(data, "name")) {
    delete prepared.normalizedName;
  }

  return prepared;
};

const isDuplicateNameError = (error) =>
  error?.code === 11000 &&
  (error?.keyPattern?.normalizedName === 1 ||
    error?.keyPattern?.ownerId === 1 ||
    error?.message?.includes("unique_company_rule_name"));

const handleRepositoryError = (error) => {
  if (!isDuplicateNameError(error)) {
    throw error;
  }

  const conflict = new Error(
    "A company security rule with this name already exists.",
  );

  conflict.statusCode = 409;
  conflict.code = "COMPANY_RULE_NAME_EXISTS";

  throw conflict;
};

const createRule = async ({ ownerId, data }) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId = assertOwnerId(ownerId);
  const preparedData = prepareRuleData(data);

  try {
    return await companyRuleRepository.create({
      ...preparedData,
      ownerId: normalizedOwnerId,
    });
  } catch (error) {
    handleRepositoryError(error);
  }
};

const getRule = async ({ ownerId, ruleId }) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedRuleId = assertRuleId(ruleId);

  const rule = await companyRuleRepository.findById(
    normalizedOwnerId,
    normalizedRuleId,
  );

  if (!rule) {
    const error = new Error("Company security rule was not found.");

    error.statusCode = 404;
    error.code = "COMPANY_RULE_NOT_FOUND";

    throw error;
  }

  return rule;
};

const listRules = async ({ ownerId, options = {} }) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId = assertOwnerId(ownerId);

  return companyRuleRepository.list(normalizedOwnerId, options);
};

const updateRule = async ({ ownerId, ruleId, data }) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedRuleId = assertRuleId(ruleId);
  const preparedData = prepareRuleData(data);

  try {
    const rule = await companyRuleRepository.update(
      normalizedOwnerId,
      normalizedRuleId,
      preparedData,
    );

    if (!rule) {
      const error = new Error("Company security rule was not found.");

      error.statusCode = 404;
      error.code = "COMPANY_RULE_NOT_FOUND";

      throw error;
    }

    return rule;
  } catch (error) {
    handleRepositoryError(error);
  }
};

const deleteRule = async ({ ownerId, ruleId }) => {
  assertCompanyRulesAccess();

  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedRuleId = assertRuleId(ruleId);

  const result = await companyRuleRepository.deleteById(
    normalizedOwnerId,
    normalizedRuleId,
  );

  if (result.deletedCount === 0) {
    const error = new Error("Company security rule was not found.");

    error.statusCode = 404;
    error.code = "COMPANY_RULE_NOT_FOUND";

    throw error;
  }

  return {
    deleted: true,
    ruleId: normalizedRuleId.toString(),
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
