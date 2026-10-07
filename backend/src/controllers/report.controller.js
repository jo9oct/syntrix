// STATUS: UPDATED

import {
  createReport as createReportService,
  getReport as getReportService
} from "../services/report.service.js";

const createReport = async (req, res, next) => {
  try {
    const {
      scanId,
      format
    } = req.body;

    const result =
      await createReportService({
        ownerId:
          req.auth.ownerId,

        userType:
          req.auth.userType,

        scanId,
        format
      });

    return res.status(
      result.queued
        ? 202
        : 200
    ).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getReport = async (req, res, next) => {
  try {
    const {
      reportId
    } = req.params;

    const report =
      await getReportService({
        ownerId:
          req.auth.ownerId,

        userType:
          req.auth.userType,

        reportId
      });

    return res.status(200).json({
      success: true,
      data: {
        report
      }
    });
  } catch (error) {
    next(error);
  }
};

export {
  createReport,
  getReport
};