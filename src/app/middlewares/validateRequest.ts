import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type RequestValidationTarget = {
  body: unknown;
  params: unknown;
  query: unknown;
};

const validateRequest = (
  schema: ZodType<Partial<RequestValidationTarget>>
): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const parsedData = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query
      });

      if (Object.prototype.hasOwnProperty.call(parsedData, 'body')) {
        req.body = parsedData.body;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
