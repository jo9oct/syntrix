const errorMiddleware = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  const statusCode = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500;

  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

  const requestId = request.id || null;

  const isOperational = error?.isOperational === true || safeStatus < 500;

  const message = isOperational ? error.message : "Internal server error.";

  console.error(
    JSON.stringify({
      event: "request.error",
      requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: safeStatus,
      error: error?.message,
      stack: error?.stack,
    }),
  );

  return response.status(safeStatus).json({
    error: {
      code: error?.code || "INTERNAL_SERVER_ERROR",
      message,
      requestId,
    },
  });
};

export { errorMiddleware };
