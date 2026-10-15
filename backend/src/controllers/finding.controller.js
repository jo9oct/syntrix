// STATUS: UPDATED

import {
  listFindings as listFindingsService,
  getFinding as getFindingService,
  updateFinding as updateFindingService,
} from "../services/finding.service.js";

import { getOwnerId } from "../middleware/authorization.middleware.js";

const listFindings = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const result = await listFindingsService({
      ownerId,

      scanId: req.query.scanId,

      severity: req.query.severity,

      confidence: req.query.confidence,

      status: req.query.status,

      scannerId: req.query.scannerId,

      limit: req.query.limit,

      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,

      data: {
        findings: result,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getFinding = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const finding = await getFindingService({
      ownerId,

      findingId: req.params.findingId,
    });

    return res.status(200).json({
      success: true,

      data: {
        finding,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateFinding = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const finding = await updateFindingService({
      ownerId,

      findingId: req.params.findingId,

      status: req.body.status,

      remediation: req.body.remediation,
    });

    return res.status(200).json({
      success: true,

      data: {
        finding,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export { listFindings, getFinding, updateFinding };
