export const errorHandler = (err, req, res, next) => {
  console.error("[Error]", err.stack);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    error:
      statusCode === 500
        ? "Internal Server Error"
        : err.message || "Request failed",
  });
};
