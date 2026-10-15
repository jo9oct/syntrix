// STATUS: UPDATED
// File: src/controllers/scan.controller.js

import { getOwnerId } from "../middleware/authorization.middleware.js";

import { createScan, getScan, cancelScan } from "../services/scan.service.js";

import {
  deleteScan,
  recoverScan,
  listDeletedScans,
} from "../services/scanLifecycle.service.js";

import { getLatestComparisonResult } from "../services/scanComparison.service.js";

const createScanController = async (req, res, next) => {
  try {
    const {
      targetUrl,
      scanSelection,
      scopes = [],
      companyRuleIds = [],
      credentials = null,
      idempotencyKey = null,
    } = req.body;

    const result = await createScan({
      ownerId: getOwnerId(req),
      targetUrl,
      scanSelection,
      scopes,
      companyRuleIds,
      credentials,
      idempotencyKey,
      isGuest: req.auth?.userType === "guest",
    });

    return res.status(result.duplicated ? 200 : 202).json({
      success: true,
      data: {
        scan: result.scan,
        duplicated: result.duplicated,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getScanController = async (req, res, next) => {
  try {
    const result = await getScan({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

const cancelScanController = async (req, res, next) => {
  try {
    const result = await cancelScan({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
    });

    return res.status(200).json({
      success: true,
      data: {
        scan: result,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getLatestComparisonResultController = async (req, res, next) => {
  try {
    const result = await getLatestComparisonResult({
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

const deleteScanController = async (req, res, next) => {
  try {
    const result = await deleteScan({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
    });

    return res.status(200).json({
      success: true,
      data: {
        scan: result.scan,
        duplicated: result.duplicated,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const recoverScanController = async (req, res, next) => {
  try {
    const result = await recoverScan({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
      isGuest: req.auth?.userType === "guest",
    });

    return res.status(200).json({
      success: true,
      data: {
        scan: result.scan,
        duplicated: result.duplicated,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listDeletedScansController = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const skip = Number(req.query.skip ?? 0);

    const result = await listDeletedScans({
      ownerId: getOwnerId(req),
      limit,
      skip,
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
  createScanController,
  getScanController,
  cancelScanController,
  getLatestComparisonResultController,
  deleteScanController,
  recoverScanController,
  listDeletedScansController,
};
