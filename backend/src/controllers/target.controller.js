// STATUS: CREATED

import { getOwnerId } from "../middleware/authorization.middleware.js";

import { listTargets, getTargetDetails } from "../services/target.service.js";

import { getTargetTrends } from "../services/scanComparison.service.js";

import * as scanRepository from "../database/repositories/scan.repository.js";

import * as targetRepository from "../database/repositories/target.repository.js";

const listTargetsController = async (req, res, next) => {
  try {
    const result = await listTargets({
      ownerId: getOwnerId(req),
      limit: req.query.limit,
      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const getTargetController = async (req, res, next) => {
  try {
    const result = await getTargetDetails({
      ownerId: getOwnerId(req),
      targetId: req.params.targetId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const getTargetScansController = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const { targetId } = req.params;

    const target = await targetRepository.findById(ownerId, targetId);

    if (!target || !target.isActive) {
      const error = new Error("Target was not found.");

      error.statusCode = 404;
      error.code = "TARGET_NOT_FOUND";

      throw error;
    }

    const result = await scanRepository.list(ownerId, {
      targetId: target._id,
      limit: req.query.limit,
      skip: req.query.skip,
      sort: {
        createdAt: -1,
        _id: -1,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        targetId: target._id,
        scans: result,
        pagination: {
          limit: req.query.limit,
          skip: req.query.skip,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getTargetTrendsController = async (req, res, next) => {
  try {
    const result = await getTargetTrends({
      ownerId: getOwnerId(req),
      targetId: req.params.targetId,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  listTargetsController,
  getTargetController,
  getTargetScansController,
  getTargetTrendsController,
};
