import express from 'express';
import { ImageUploadController } from '../controllers/image-upload.controller';
import { asyncHandler } from '../utils/async-handler';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();
const imageUploadController = new ImageUploadController();

/**
 * @route   POST /api/v1/images/profile
 * @desc    Upload profile image
 * @access  Private
 * @body    {image} - base64 encoded image
 * @requires Authentication
 */
router.post('/profile',
    authMiddleware(),
    asyncHandler(imageUploadController.uploadProfileImage.bind(imageUploadController))
);

export default router;