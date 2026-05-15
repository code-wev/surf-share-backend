import cors, { type CorsOptions } from "cors";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import config from "./app/config";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import router from "./app/routes";
import sendResponse from "./app/utils/sendResponse";

const app: Application = express();

const corsOptions: CorsOptions = {
  // When CORS_ORIGIN is set to '*' reflect the request origin
  // (returns the request's Origin header) instead of sending '*'.
  // This is required when `credentials: true` so the browser
  // doesn't reject the response for credentialed requests.
  origin:
    config.corsOrigin === "*" 
      ? true
      : config.corsOrigin.split(",").map((origin) => origin.trim()),
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());

// Stripe Webhook needs raw body, not parsed JSON
app.use("/api/v1/checkout/webhook", express.raw({ type: "application/json" }));

app.use((req, res, next) => {
  if (req.originalUrl === "/api/v1/checkout/webhook") {
    next();
  } else {
    express.json({ limit: "1mb" })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

app.use(
  "/api",
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  }),
);

app.get("/health", (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Server is healthy.",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/v1", router);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
