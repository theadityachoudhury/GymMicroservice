import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { HttpError } from '../utils/http-error';
import logger from '../config/logger';

export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
    userRole?: string;
}

export const authMiddleware = (requiredRoles?: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            // Check for Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new HttpError(401, 'Authorization header missing or invalid');
            }

            // Extract the token
            const token = authHeader.split(' ')[1];
            if (!token) {
                throw new HttpError(401, 'Token missing');
            }

            // Verify the token
            const authService = new AuthService();
            const decodedToken = authService.verifyToken(token);

            // Attach user data to request object
            req.userId = decodedToken.userId;
            req.userEmail = decodedToken.email;
            req.userRole = decodedToken.role;

            // Check required roles if specified
            if (requiredRoles && requiredRoles.length > 0) {
                if (!requiredRoles.includes(decodedToken.role)) {
                    throw new HttpError(403, 'Insufficient permissions');
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Helper middleware for specific roles
export const adminOnly = authMiddleware(['admin']);
export const coachOnly = authMiddleware(['coach']);
export const clientOnly = authMiddleware(['client']);
export const coachOrAdmin = authMiddleware(['coach', 'admin']);