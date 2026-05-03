import type { NextFunction, Request, RequestHandler, Response } from 'express';

const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
};

export default catchAsync;
