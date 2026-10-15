// STATUS: CREATED

import {
  listEvidenceByFinding as listEvidenceByFindingService,
  listEvidenceByScan as listEvidenceByScanService,
  getEvidence as getEvidenceService,
} from "../services/evidence.service.js";

import { getOwnerId } from "../middleware/authorization.middleware.js";

const listEvidenceByFinding = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const result = await listEvidenceByFindingService({
      ownerId,

      findingId: req.params.findingId,

      type: req.query.type,

      scannerId: req.query.scannerId,

      limit: req.query.limit,

      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,

      data: {
        evidence: result,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listEvidenceByScan = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const result = await listEvidenceByScanService({
      ownerId,

      scanId: req.query.scanId,

      findingId: req.query.findingId,

      type: req.query.type,

      scannerId: req.query.scannerId,

      limit: req.query.limit,

      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,

      data: {
        evidence: result,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getEvidence = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const evidence = await getEvidenceService({
      ownerId,

      evidenceId: req.params.evidenceId,
    });

    return res.status(200).json({
      success: true,

      data: {
        evidence,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export { listEvidenceByFinding, listEvidenceByScan, getEvidence };
