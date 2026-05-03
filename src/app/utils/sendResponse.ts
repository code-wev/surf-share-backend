import type { Response } from 'express';

interface ISendResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

const sendResponse = <T>(res: Response, payload: ISendResponse<T>): void => {
  const { statusCode, success, message, data, meta } = payload;

  res.status(statusCode).json({
    success,
    message,
    meta,
    data
  });
};

export default sendResponse;
