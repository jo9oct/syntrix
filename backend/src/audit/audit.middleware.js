import { auditLog } from "./audit.service.js";

const resolveOwnerId = (request) =>
  request.user?.ownerId ||
  request.user?.id ||
  request.user?.userId ||
  request.auth?.ownerId ||
  request.auth?.userId ||
  null;

const createAuditMiddleware = ({
  action,
  resourceType = null,
  resolveResourceId = null,
} = {}) => {
  if (!action) {
    throw new Error("Audit action is required.");
  }

  return (request, response, next) => {
    const ownerId = resolveOwnerId(request);

    if (!ownerId) {
      return next();
    }

    const resourceId =
      typeof resolveResourceId === "function"
        ? resolveResourceId(request)
        : null;

    const originalEnd = response.end;

    response.end = function (...args) {
      response.end = originalEnd;

      void auditLog({
        ownerId,
        action,
        actorType: "user",
        actorId: request.user?.id || request.auth?.userId || null,
        resourceType,
        resourceId,
        requestId: request.id || null,
        metadata: {
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
        },
      });

      return response.end(...args);
    };

    return next();
  };
};

export { createAuditMiddleware };
