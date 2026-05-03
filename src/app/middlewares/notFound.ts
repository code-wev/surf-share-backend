import type { RequestHandler } from 'express';

import AppError from '../errors/AppError';

const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.originalUrl} not found.`));
};

export default notFound;
