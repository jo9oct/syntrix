import {
  getHealth
} from "../health/health.service.js";
import {
  getMetrics
} from "../metrics/metrics.service.js";

const getHealthStatus =
  async (
    request,
    response,
    next
  ) => {
    try {
      const health =
        await getHealth();

      return response
        .status(
          health.status ===
            "healthy"
            ? 200
            : 503
        )
        .json({
          data: health
        });
    } catch (error) {
      return next(error);
    }
  };

const getApplicationMetrics =
  async (
    request,
    response,
    next
  ) => {
    try {
      return response
        .status(200)
        .json({
          data:
            getMetrics()
        });
    } catch (error) {
      return next(error);
    }
  };

export {
  getHealthStatus,
  getApplicationMetrics
};