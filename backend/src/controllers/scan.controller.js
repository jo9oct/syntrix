// STATUS: UPDATED

import {
  createScan as createScanService,
  getScan as getScanService,
  cancelScan as cancelScanService,
} from '../services/scan.service.js';

import {
  getOwnerId,
} from '../middleware/authorization.middleware.js';

const createScan = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const result =
      await createScanService({
        ownerId,

        isGuest:
          req.auth?.userType ===
          'guest',

        targetUrl:
          req.body.targetUrl,

        scanSelection:
          req.body.scanSelection,

        companyRuleIds:
          req.body.companyRuleIds ??
          [],

        credentials:
          req.body.credentials ??
          null,

        idempotencyKey:
          req.body.idempotencyKey ??
          null,
      });

    res.status(
      result.duplicated
        ? 200
        : 202,
    ).json({
      success:
        true,

      data: {
        scan:
          result.scan,

        duplicated:
          result.duplicated,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getScan = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const result =
      await getScanService({
        ownerId,

        scanId:
          req.params.scanId,
      });

    res.status(200).json({
      success:
        true,

      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const cancelScan = async (
  req,
  res,
  next,
) => {
  try {
    const ownerId =
      getOwnerId(req);

    const scan =
      await cancelScanService({
        ownerId,

        scanId:
          req.params.scanId,
      });

    res.status(200).json({
      success:
        true,

      data: {
        scan,
      },
    });
  } catch (error) {
    next(error);
  }
};

export {
  createScan,
  getScan,
  cancelScan,
};