import { z } from 'zod';


export enum UserPreferableActivity {
    YOGA = 'YOGA',
    CLIMBING = 'CLIMBING',
    STRENGTH_TRAINING = 'STRENGTH TRAINING',
    CROSSFIT = 'CROSSFIT',
    CARDIO_TRAINING = 'CARDIO RAINING',
    REHABILITATION = 'REHABILITATION',
}

export enum UserTarget {
    LOSE_WEIGHT = 'LOSE WEIGHT',
    GAIN_WEIGHT = 'GAIN WEIGHT',
    IMPROVE_FLEXIBILITY = 'IMPROVE FLEXIBILITY',
    GENERAL_FITNESS = 'GENERAL FITNESS',
    BUILD_MUSCLE = 'BUILD MUSCLE',
    REHABILITATION_RECOVERY = 'REHABILITATION RECOVERY',
}

const nameValidation = z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name is too long');

const passwordValidation = z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/^\S*$/, 'Password cannot contain spaces')
    .max(16, 'Password should be less than 16 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Signup schema
export const signupSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Invalid email address'),
    firstName: nameValidation,
    lastName: nameValidation,
    password: passwordValidation.max(100, 'Password is too long'),
    preferableActivity: z.nativeEnum(UserPreferableActivity, {
        errorMap: () => ({ message: 'Please select a valid activity' }),
    }),
    target: z.nativeEnum(UserTarget, {
        errorMap: () => ({ message: 'Please select a valid target' }),
    }),
});

// Login schema
export const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

// Refresh token schema
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

// Type inference
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;