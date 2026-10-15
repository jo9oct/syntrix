// STATUS: UPDATED
// File: src/controllers/report.controller.js

import {
  createReport as createReportService,
  getReport as getReportService,
  getReportsByScan as getReportsByScanService,
} from "../services/report.service.js";

const createReport = async (req, res, next) => {
  try {
    const { scanId, format } = req.body;

    const result = await createReportService({
      ownerId: req.auth.ownerId,
      userType: req.auth.userType,
      scanId,
      format,
    });

    return res.status(result.queued ? 202 : 200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await getReportService({
      ownerId: req.auth.ownerId,
      userType: req.auth.userType,
      reportId,
    });

    return res.status(200).json({
      success: true,
      data: {
        report,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getReportsByScan = async (req, res, next) => {
  try {
    const { scanId } = req.query;

    const result = await getReportsByScanService({
      ownerId: req.auth.ownerId,
      userType: req.auth.userType,
      scanId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export { createReport, getReport, getReportsByScan };
