import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import config from '../config';
import AppError from '../errors/AppError';

type ErrorSource = {
  path: string;
  message: string;
};

type ErrorWithCode = {
  code?: unknown;
  meta?: unknown;
};

const isErrorWithCode = (error: unknown): error is ErrorWithCode => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Something went wrong.';
  let errorSources: ErrorSource[] = [
    {
      path: '',
      message
    }
  ];

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed.';
    errorSources = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err.message
      }
    ];
  } else if (isErrorWithCode(err) && err.code === 'P2002') {
    statusCode = 409;
    message = 'Duplicate resource.';
    errorSources = [
      {
        path: Array.isArray((err.meta as { target?: unknown })?.target)
          ? ((err.meta as { target: string[] }).target.join('.'))
          : '',
        message
      }
    ];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err.message
      }
    ];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: config.nodeEnv === 'development' && err instanceof Error ? err.stack : undefined
  });
};

export default globalErrorHandler;
