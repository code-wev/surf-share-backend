import { z } from 'zod';

const register = z.object({
  body: z
    .object({
      email: z
        .string({ error: 'Email is required.' })
        .trim()
        .email('Email must be a valid email address.')
        .transform((value) => value.toLowerCase()),
      password: z
        .string({ error: 'Password is required.' })
        .min(8, 'Password must be at least 8 characters long.')
    })
    .strict()
});

const login = z.object({
  body: z
    .object({
      email: z
        .string({ error: 'Email is required.' })
        .trim()
        .email('Email must be a valid email address.')
        .transform((value) => value.toLowerCase()),
      password: z.string({ error: 'Password is required.' })
    })
    .strict()
});

export const UserValidation = {
  register,
  login
};
