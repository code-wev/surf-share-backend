import { z } from 'zod';

// We map permissions strings from Prisma client in actual use, but here we can just use strings
const ModeratorPermissionEnum = z.enum(['APPROVE_PHOTO', 'ADD_LOCATION', 'ALL_ACCESS']);

const passwordValidation = z
  .string({ message: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters long.');

const baseUserValidation = {
  name: z.string({ message: 'Name is required.' }).trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string({ message: 'Email is required.' }).trim().email('Email must be a valid email address.').transform((v) => v.toLowerCase()),
  password: passwordValidation,
  countryName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
};

const registerSurfer = z.object({
  body: z.object({ ...baseUserValidation }).strict()
});

const registerPhotographer = z.object({
  body: z.object({
    ...baseUserValidation,
    paypalEmail: z.string({ message: 'Paypal email is required for photographers.' }).trim().email('Paypal email must be a valid email address.').transform((v) => v.toLowerCase()),
  }).strict()
});

const registerModerator = z.object({
  body: z.object({
    ...baseUserValidation,
    permissions: z.array(ModeratorPermissionEnum).min(1, 'At least one permission is required.'),
  }).strict()
});

const login = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required.' }).trim().email('Email must be a valid email address.').transform((v) => v.toLowerCase()),
    password: z.string({ message: 'Password is required.' })
  }).strict()
});

const updateUser = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    countryName: z.string().optional(),
    address: z.string().optional(),
    phoneNumber: z.string().optional(),
    paypalEmail: z.string().email().optional(),
    permissions: z.array(ModeratorPermissionEnum).optional(),
  }).strict()
});

export const UserValidation = {
  registerSurfer,
  registerPhotographer,
  registerModerator,
  login,
  updateUser
};
