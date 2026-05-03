import cors, { type CorsOptions } from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import config from './app/config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import router from './app/routes';
import sendResponse from './app/utils/sendResponse';

const app: Application = express();

const corsOptions: CorsOptions = {
  origin:
    config.corsOrigin === '*'
      ? '*'
      : config.corsOrigin.split(',').map((origin) => origin.trim()),
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.'
    }
  })
);

app.get('/health', (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Server is healthy.',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/v1', router);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
