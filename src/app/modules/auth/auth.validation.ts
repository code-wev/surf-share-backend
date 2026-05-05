import { z } from "zod";

const forgotPassword = z.object({
  body: z
    .object({
      email: z
        .string({ message: "Email is required." })
        .trim()
        .email("Email must be a valid email address.")
        .transform((v) => v.toLowerCase()),
    })
    .strict(),
});

const verifyOtp = z.object({
  body: z
    .object({
      email: z
        .string({ message: "Email is required." })
        .trim()
        .email("Email must be a valid email address.")
        .transform((v) => v.toLowerCase()),
      otp: z
        .string({ message: "OTP is required." })
        .trim()
        .length(6, "OTP must be exactly 6 digits."),
    })
    .strict(),
});

const resetPassword = z.object({
  body: z
    .object({
      token: z.string({ message: "Reset token is required." }),
      newPassword: z
        .string({ message: "New password is required." })
        .min(8, "Password must be at least 8 characters long."),
    })
    .strict(),
});

export const AuthValidation = {
  forgotPassword,
  verifyOtp,
  resetPassword,
};
