import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { HttpError } from '../utils/http-error';
import logger from '../config/logger';
import { ImageUploadService } from '../services/image-upload.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';

// Schema for image upload validation
const imageUploadSchema = z.object({
    image: z.string().min(1, 'Image is required')
});

export class ImageUploadController {
    private imageUploadService: ImageUploadService;

    constructor() {
        this.imageUploadService = new ImageUploadService();
    }

    /**
     * Upload profile image and update user record
     */
    async uploadProfileImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Processing profile image upload request');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = imageUploadSchema.parse(req.body);
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

            // Find the user
            const user = await User.findById(req.userId);

            if (!user) {
                logger.warn('User not found', { userId: req.userId });
                throw new HttpError(404, 'User not found');
            }

            // Check if the image is a base64 string
            if (!validatedData.image.startsWith('data:image')) {
                logger.warn('Invalid image format', { userId: req.userId });
                throw new HttpError(400, 'Invalid image format. Please provide a valid base64 encoded image.');
            }

            // Upload the image
            const imageUrl = await this.imageUploadService.uploadProfileImage(
                validatedData.image,
                user.role,
                req.userId
            );

            // Update the user's image field
            await User.updateOne(
                { _id: user._id },
                { $set: { image: imageUrl } }
            );

            logger.info('Profile image updated successfully', { userId: req.userId });

            res.status(200).json({
                status: 'success',
                message: 'Profile image uploaded successfully',
                data: { imageUrl }
            });
        } catch (error) {
            next(error);
        }
    }
}