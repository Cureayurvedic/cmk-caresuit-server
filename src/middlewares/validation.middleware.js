import { ValidationError } from "../utils/errors.js";

export const validate = (schema, target = "body") => {
  return (req, res, next) => {
    const parseResult = schema.safeParse(req[target]);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new ValidationError("Validation failed", details));
    }

    // Assign validated and parsed data back to the request target (stripping extra fields)
    req[target] = parseResult.data;
    next();
  };
};

export default validate;
