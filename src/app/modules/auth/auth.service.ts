import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Role, Prisma } from "@prisma/client";

import config from "../../config";
import AppError from "../../errors/AppError";
import prisma from "../../utils/prisma";
import emailService from "../../utils/emailService";
import type {
  IForgotPasswordPayload,
  IVerifyOtpPayload,
  IResetPasswordPayload,
  IVerifyOtpResponse,
  IForgotPasswordResponse,
  IResetPasswordResponse,
} from "./auth.interface";
import type {
  ISurferRegisterPayload,
  IPhotographerRegisterPayload,
  IModeratorRegisterPayload,
  IUserLoginPayload,
  ILoginResponse,
  IUserResponse,
} from "../user/user.interface";

// Helper function to sanitize user data before sending it in responses
const sanitizeUser = (user: any): IUserResponse => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  countryName: user.countryName,
  address: user.address,
  phoneNumber: user.phoneNumber,
  paypalEmail: user.paypalEmail,
  permissions: user.permissions as any,
  socialAccounts: user.socialAccount || undefined,
});

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP using bcrypt
 */
const hashOTP = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, Number(config.bcryptSaltRounds));
};

/**
 * Compare OTP with hashed OTP
 */
const compareOTP = async (otp: string, hashedOTP: string): Promise<boolean> => {
  return bcrypt.compare(otp, hashedOTP);
};

// Check if a user with the given email already exists
const checkExistingUser = async (email: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }
};

// Register as Surfer
const registerSurfer = async (
  payload: ISurferRegisterPayload,
): Promise<IUserResponse> => {
  await checkExistingUser(payload.email);
  const hashedPassword = await bcrypt.hash(
    payload.password!,
    Number(config.bcryptSaltRounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      countryName: payload.countryName,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      password: hashedPassword,
      role: Role.SURFER,
    },
  });

  return sanitizeUser(user);
};

// Register as Photographer
const registerPhotographer = async (
  payload: IPhotographerRegisterPayload,
): Promise<IUserResponse> => {
  await checkExistingUser(payload.email);
  const hashedPassword = await bcrypt.hash(
    payload.password!,
    Number(config.bcryptSaltRounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      countryName: payload.countryName,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      paypalEmail: payload.paypalEmail,
      socialAccount: (payload.socialAccounts ??
        []) as unknown as Prisma.InputJsonValue,
      password: hashedPassword,
      role: Role.PHOTOGRAPHER,
    },
  });

  return sanitizeUser(user);
};

// Register as Moderator
const registerModerator = async (
  payload: IModeratorRegisterPayload,
): Promise<IUserResponse> => {
  await checkExistingUser(payload.email);
  const rawPassword = payload.password!;
  const hashedPassword = await bcrypt.hash(
    rawPassword,
    Number(config.bcryptSaltRounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      countryName: payload.countryName,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      permissions: payload.permissions,
      password: hashedPassword,
      role: Role.MODERATOR,
    },
  });

  // Send credentials email
  void emailService.sendModeratorCredentials(user.email, user.name, rawPassword);

  return sanitizeUser(user);
};

// Login
const loginUser = async (
  payload: IUserLoginPayload,
): Promise<ILoginResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) throw new AppError(401, "Invalid email or password.");

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );
  if (!isPasswordMatched) throw new AppError(401, "Invalid email or password.");

  const authPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(authPayload, config.jwt.accessSecret as string, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });

  return { accessToken, user: sanitizeUser(user) };
};

/**
 * Forgot Password - Generate OTP and send via email
 */
const forgotPassword = async (
  payload: IForgotPasswordPayload,
): Promise<IForgotPasswordResponse> => {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // For security, don't reveal if email exists
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive an OTP shortly.",
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const otpExpiry = new Date(
      Date.now() + config.otp.expiryMinutes * 60 * 1000,
    );

    // Save OTP to database
    await prisma.user.update({
      where: { email: payload.email },
      data: {
        otp: hashedOTP,
        otpExpiry,
      },
    });

    // Send OTP via email
    const emailSent = await emailService.sendOtpEmail(payload.email, otp);

    if (!emailSent) {
      throw new AppError(500, "Failed to send OTP. Please try again later.");
    }

    return {
      success: true,
      message: "OTP sent to your email. Please check your inbox.",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Forgot password error:", error);
    throw new AppError(500, "Failed to process forgot password request.");
  }
};

/**
 * Verify OTP and return reset token
 */
const verifyOtp = async (
  payload: IVerifyOtpPayload,
): Promise<IVerifyOtpResponse> => {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw new AppError(404, "User not found.");
    }

    if (!user.otp || !user.otpExpiry) {
      throw new AppError(400, "No OTP found. Please request a new one.");
    }

    // Check OTP expiry
    if (new Date() > user.otpExpiry) {
      await prisma.user.update({
        where: { email: payload.email },
        data: { otp: null, otpExpiry: null },
      });
      throw new AppError(400, "OTP has expired. Please request a new one.");
    }

    // Verify OTP
    const isOtpValid = await compareOTP(payload.otp, user.otp);

    if (!isOtpValid) {
      throw new AppError(401, "Invalid OTP. Please try again.");
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(
      resetToken,
      Number(config.bcryptSaltRounds),
    );
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token to database and clear OTP
    await prisma.user.update({
      where: { email: payload.email },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
        otp: null,
        otpExpiry: null,
      },
    });

    // Generate JWT reset token for frontend
    const jwtResetToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.resetSecret,
      { expiresIn: config.jwt.resetExpiresIn },
    );

    return {
      success: true,
      message: "OTP verified successfully.",
      resetToken: jwtResetToken,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Verify OTP error:", error);
    throw new AppError(500, "Failed to verify OTP.");
  }
};

/**
 * Reset Password
 */
const resetPassword = async (
  payload: IResetPasswordPayload,
): Promise<IResetPasswordResponse> => {
  try {
    // Verify JWT reset token
    let decoded: any;
    try {
      decoded = jwt.verify(payload.token, config.jwt.resetSecret);
    } catch (error) {
      throw new AppError(401, "Invalid or expired reset token.");
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError(404, "User not found.");
    }

    if (!user.resetToken || !user.resetTokenExpiry) {
      throw new AppError(
        400,
        "Reset token not found. Please request a new one.",
      );
    }

    // Check reset token expiry
    if (new Date() > user.resetTokenExpiry) {
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      throw new AppError(
        400,
        "Reset token has expired. Please request a new one.",
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      payload.newPassword,
      Number(config.bcryptSaltRounds),
    );

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Reset password error:", error);
    throw new AppError(500, "Failed to reset password.");
  }
};

export const AuthService = {
  registerSurfer,
  registerPhotographer,
  registerModerator,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
