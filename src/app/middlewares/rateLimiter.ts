import rateLimit from "express-rate-limit";

// Limit login attempts: 3 wrong, block for 1 hour.
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 failed requests per hour
  skipSuccessfulRequests: true, // Only count failed requests
  message: {
    success: false,
    message: "Too many failed login attempts from this IP. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit OTP requests: 1 code every 5 minutes.
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1, // Limit each IP to 1 request per 5 minutes
  message: {
    success: false,
    message: "You can only request one OTP every 5 minutes. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
