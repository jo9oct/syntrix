// STATUS: CREATED

import {
  getOwnerId,
} from '../middleware/authorization.middleware.js';

import {
  getCrawlSummary as getCrawlSummaryService,
  getCrawlPages as getCrawlPagesService,
  getCrawlInputs as getCrawlInputsService,
} from '../services/crawl.service.js';

const getCrawlSummary = async (req, res, next) => {
  try {
    const data = await getCrawlSummaryService({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getCrawlPages = async (req, res, next) => {
  try {
    const data = await getCrawlPagesService({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
      limit: req.query.limit,
      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getCrawlInputs = async (req, res, next) => {
  try {
    const data = await getCrawlInputsService({
      ownerId: getOwnerId(req),
      scanId: req.params.scanId,
      limit: req.query.limit,
      skip: req.query.skip,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  getCrawlSummary,
  getCrawlPages,
  getCrawlInputs,
};