import { z } from 'zod';

export const getSignupSchema = () => {
  return z
    .object({
      name: z.string().min(1, { message: 'Name is required.' }),
      mobile: z
        .string()
        .min(1, { message: 'Mobile number is required.' })
        .regex(/^[0-9+\-\s()]{6,20}$/, {
          message: 'Please enter a valid mobile number.',
        }),
      email: z
        .string()
        .trim()
        .optional()
        .or(z.literal(''))
        .refine(
          (value) => !value || z.string().email().safeParse(value).success,
          { message: 'Please enter a valid email address.' },
        ),
      password: z
        .string()
        .min(6, { message: 'Password must be at least 6 characters.' })
        .regex(/[A-Z]/, {
          message: 'Password must contain at least one uppercase letter.',
        })
        .regex(/[0-9]/, {
          message: 'Password must contain at least one number.',
        }),
      confirmPassword: z
        .string()
        .min(1, { message: 'Please confirm your password.' }),
      role: z.enum(['USER', 'OPERATOR', 'ADMIN']),
      adminCreationKey: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ['confirmPassword'],
        });
      }

      if (data.role === 'ADMIN' && !data.adminCreationKey?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Admin creation key is required for ADMIN role.',
          path: ['adminCreationKey'],
        });
      }
    });
};

export type SignupSchemaType = z.infer<ReturnType<typeof getSignupSchema>>;
