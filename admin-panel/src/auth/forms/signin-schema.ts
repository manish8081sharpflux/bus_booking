import { z } from 'zod';

export const getSigninSchema = () => {
  return z.object({
    email: z
      .string()
      .min(1, { message: 'Mobile number is required.' })
      .regex(/^[0-9+\-\s()]{6,20}$/, {
        message: 'Please enter a valid mobile number.',
      }),
    password: z.string().min(1, { message: 'Password is required.' }),
    rememberMe: z.boolean().optional(),
  });
};

export type SigninSchemaType = z.infer<ReturnType<typeof getSigninSchema>>;
