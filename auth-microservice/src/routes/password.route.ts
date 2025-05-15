import express from 'express';
import { asyncHandler } from '../utils/async-handler';
import { PasswordController } from '../services/password.service';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();
const passwordController = new PasswordController();

/**
 * @route   POST /api/v1/password/change
 * @desc    Change user password (when user is logged in)
 * @access  Private
 * @body    {currentPassword, newPassword, confirmPassword}
 * @requires Authentication
 */
router.put('/',
    authMiddleware(),
    asyncHandler(passwordController.changePassword.bind(passwordController))
);

export default router;