// STATUS: UPDATED
// File: src/database/repositories/companyRule.repository.js

import CompanyRule from "../models/companyRule.model.js";

const create = async (data) => CompanyRule.create(data);

const findById = async (ownerId, ruleId) =>
  CompanyRule.findOne({
    _id: ruleId,
    ownerId,
  }).lean();

const findByIds = async (ownerId, ruleIds) =>
  CompanyRule.find({
    _id: { $in: ruleIds },
    ownerId,
    enabled: true,
  })
    .sort({ createdAt: -1 })
    .lean();

const list = async (ownerId, options = {}) => {
  const { category, enabled, limit = 50, skip = 0 } = options;

  const filter = { ownerId };

  if (category) {
    filter.category = category;
  }

  if (typeof enabled === "boolean") {
    filter.enabled = enabled;
  }

  return CompanyRule.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const update = async (ownerId, ruleId, data) =>
  CompanyRule.findOneAndUpdate(
    {
      _id: ruleId,
      ownerId,
    },
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

const deleteById = async (ownerId, ruleId) =>
  CompanyRule.deleteOne({
    _id: ruleId,
    ownerId,
  });

export { create, findById, findByIds, list, update, deleteById };
