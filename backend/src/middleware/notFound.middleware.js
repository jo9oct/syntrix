const notFoundMiddleware = (
  request,
  response
) => {
  return response
    .status(404)
    .json({
      error: {
        code:
          "ROUTE_NOT_FOUND",
        message:
          "The requested route was not found.",
        requestId:
          request.id || null
      }
    });
};

export {
  notFoundMiddleware
};