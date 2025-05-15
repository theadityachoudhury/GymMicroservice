import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const authController = new AuthController();

router.post('/sign-up', asyncHandler(authController.signup.bind(authController)));
router.post('/sign-in', asyncHandler(authController.login.bind(authController)));
router.post('/refresh-token', asyncHandler(authController.refreshToken.bind(authController)));
router.post('/logout', asyncHandler(authController.logout.bind(authController)));
router.get('/verify-token', asyncHandler(authController.verifyToken.bind(authController)));

export default router;