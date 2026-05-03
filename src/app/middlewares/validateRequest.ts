import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

const validateRequest = (schema: ZodType<any, any, any>): RequestHandler => {
  return async (req, _res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;


