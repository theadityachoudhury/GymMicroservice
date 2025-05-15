import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ZodError } from 'zod';
import { loginSchema, refreshTokenSchema, signupSchema } from '../validators/auth.validators';
import HttpError from '../utils/http-error';
import logger from '../config/logger';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    /**
     * Handle user signup
     */
    async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body against schema
            let validatedData;
            try {
                validatedData = signupSchema.parse(req.body);
            } catch (zodError) {
                if (zodError instanceof ZodError) {
                    const formattedErrors = zodError.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }));

                    logger.warn(`Validation failed for signup request`, {
                        errors: formattedErrors,
                        requestBody: JSON.stringify(req.body)
                    });

                    throw new HttpError(400, 'Validation failed', formattedErrors);
                }
                throw zodError; // Re-throw if it's not a ZodError
            }

            // Call auth service to create user
            const result = await this.authService.signup(validatedData);

            // Send successful response
            res.status(201).json({
                status: 'success',
                message: 'Signup successful',
                data: {
                    userId: result.userId,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle user login
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body against schema
            const validatedData = loginSchema.parse(req.body);

            // Call auth service to authenticate user
            const result = await this.authService.login(validatedData);

            // Send successful response with tokens
            res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: {
                    userId: result.userId,
                    role: result.role,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                }
            });
        } catch (error) {
            if (error instanceof ZodError) {
                next(new HttpError(400, 'Validation failed', error.errors));
                return;
            }
            next(error);
        }
    }

    /**
     * Handle token refresh
     */
    async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body against schema
            const { refreshToken } = refreshTokenSchema.parse(req.body);

            // Call auth service to refresh tokens
            const tokens = await this.authService.refreshToken(refreshToken);

            // Send successful response with new tokens
            res.status(200).json({
                status: 'success',
                message: 'Token refreshed successfully',
                data: tokens
            });
        } catch (error) {
            if (error instanceof ZodError) {
                next(new HttpError(400, 'Validation failed', error.errors));
                return;
            }
            next(error);
        }
    }

    /**
     * Handle user logout
     */
    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Get user ID from request (will be set by auth middleware)
            const userId = req.body.userId;

            if (!userId) {
                throw new HttpError(401, 'Unauthorized');
            }

            // Call auth service to logout user
            await this.authService.logout(userId);

            // Send successful response
            res.status(200).json({
                status: 'success',
                message: 'Logout successful'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify token
     */
    async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Get token from request headers
            const token = req.headers['authorization']?.split(' ')[1];

            if (!token) {
                throw new HttpError(401, 'Unauthorized');
            }

            // Call auth service to verify token
            const result = this.authService.verifyToken(token);

            // Send successful response
            res.status(200).json({
                status: 'success',
                message: 'Token is valid',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}