import { Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { HttpError } from '../utils/http-error';
import logger from '../config/logger';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';

// Schema for password change validation
const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export class PasswordController {
    /**
     * Change user password
     */
    async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            logger.info('Processing password change request');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = passwordChangeSchema.parse(req.body);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    const formattedErrors = zodError.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }));
                    throw new HttpError(400, 'Validation failed', formattedErrors);
                }
                throw zodError;
            }

            // Check that new password is different from current password
            if (validatedData.currentPassword === validatedData.newPassword) {
                throw new HttpError(400, 'New password must be different from current password');
            }

            // Find user in database
            const user = await User.findById(req.userId).select('+password').session(session);

            if (!user) {
                throw new HttpError(404, 'User not found');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.password);
            if (!isPasswordValid) {
                throw new HttpError(401, 'Current password is incorrect');
            }

            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(validatedData.newPassword, salt);

            // Update the password
            user.password = hashedPassword;

            // Invalidate all refresh tokens to force re-login after password change
            user.refreshToken = undefined;

            await user.save({ session });

            await session.commitTransaction();
            session.endSession();

            logger.info('Password changed successfully');

            res.status(200).json({
                status: 'success',
                message: 'Password changed successfully'
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            next(error);
        }
    }
}