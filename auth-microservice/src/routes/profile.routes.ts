import express from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { UserRole } from '../models/user.model';
import { asyncHandler } from '../utils/async-handler';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

const router = express.Router();
const profileController = new ProfileController();

// GET profile based on user role
router.get('/', authMiddleware(), asyncHandler(async (req: AuthRequest, res, next) => {

    const userRole = req.userRole;
    console.log(userRole);

    switch (userRole) {
        case UserRole.Client:
            return profileController.getClientProfile(req, res, next);
        case UserRole.Coach:
            return profileController.getCoachProfile(req, res, next);
        case UserRole.Admin:
            return profileController.getAdminProfile(req, res, next);
        default:
            res.status(400).json({
                status: 'error',
                message: 'Unknown user role'
            });
    }
}));

// UPDATE profile based on user role
router.put('/', authMiddleware(), asyncHandler(async (req: AuthRequest, res, next) => {
    const userRole = req.userRole;

    switch (userRole) {
        case UserRole.Client:
            return profileController.updateClientProfile(req, res, next);
        case UserRole.Coach:
            return profileController.updateCoachProfile(req, res, next);
        case UserRole.Admin:
            return profileController.updateAdminProfile(req, res, next);
        default:
            res.status(400).json({
                status: 'error',
                message: 'Unknown user role'
            });
    }
}));

export default router;