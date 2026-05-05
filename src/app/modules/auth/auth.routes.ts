import { Router } from "express";

import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register/surfer",
  validateRequest(AuthValidation.registerSurfer),
  AuthController.registerSurfer,
);
router.post(
  "/register/photographer",
  validateRequest(AuthValidation.registerPhotographer),
  AuthController.registerPhotographer,
);
router.post(
  "/register/moderator",
  validateRequest(AuthValidation.registerModerator),
  AuthController.registerModerator,
);

router.post(
  "/login",
  validateRequest(AuthValidation.login),
  AuthController.loginUser,
);

// Forgot Password - Send OTP
router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPassword),
  AuthController.forgotPassword,
);

// Verify OTP
router.post(
  "/verify-otp",
  validateRequest(AuthValidation.verifyOtp),
  AuthController.verifyOtp,
);

// Reset Password
router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPassword),
  AuthController.resetPassword,
);

export const AuthRoutes = router;
