// STATUS: UPDATED

const validate = (schema, source = "body") => {
  if (!schema || typeof schema.validate !== "function") {
    throw new TypeError("A valid Joi schema is required.");
  }

  if (!["body", "query", "params"].includes(source)) {
    throw new TypeError("Validation source must be body, query, or params.");
  }

  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false,
      convert: true,
    });

    if (error) {
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";

      return next(error);
    }

    if (source === "query") {
      Object.defineProperty(req, "query", {
        configurable: true,
        enumerable: true,
        value,
        writable: false,
      });

      return next();
    }

    req[source] = value;

    return next();
  };
};

export { validate };
