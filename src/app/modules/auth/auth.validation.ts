import { z } from "zod";

const ModeratorPermissionEnum = z.enum([
  "APPROVE_PHOTO",
  "ADD_LOCATION",
  "ALL_ACCESS",
]);

const passwordValidation = z
  .string({ message: "Password is required." })
  .min(8, "Password must be at least 8 characters long.");

const baseUserValidation = {
  name: z
    .string({ message: "Name is required." })
    .trim()
    .min(2, "Name must be at least 2 characters."),
  email: z
    .string({ message: "Email is required." })
    .trim()
    .email("Email must be a valid email address.")
    .transform((v) => v.toLowerCase()),
  password: passwordValidation,
  countryName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  promotionEmail: z.boolean().optional(),
};

const registerSurfer = z.object({
  body: z.object({ ...baseUserValidation }).strict(),
});

const registerPhotographer = z.object({
  body: z
    .object({
      ...baseUserValidation,
      paypalEmail: z
        .string({ message: "Paypal email is required for photographers." })
        .trim()
        .email("Paypal email must be a valid email address.")
        .transform((v) => v.toLowerCase()),
      socialAccounts: z
        .array(
          z.object({
            platform: z.string().min(1, "Platform name is required."),
            url: z.string().url("Must be a valid URL."),
          }),
        )
        .optional(),
    })
    .strict(),
});

const registerModerator = z.object({
  body: z
    .object({
      ...baseUserValidation,
      permissions: z
        .array(ModeratorPermissionEnum)
        .min(1, "At least one permission is required."),
    })
    .strict(),
});

const login = z.object({
  body: z
    .object({
      email: z
        .string({ message: "Email is required." })
        .trim()
        .email("Email must be a valid email address.")
        .transform((v) => v.toLowerCase()),
      password: z.string({ message: "Password is required." }),
    })
    .strict(),
});

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

const changePassword = z.object({
  body: z
    .object({
      currentPassword: z.string({ message: "Current password is required." }),
      newPassword: z
        .string({ message: "New password is required." })
        .min(8, "Password must be at least 8 characters long."),
    })
    .strict(),
});

export const AuthValidation = {
  registerSurfer,
  registerPhotographer,
  registerModerator,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
};
