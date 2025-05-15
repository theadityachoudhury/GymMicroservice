// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';
import { customRequest } from '../types';
import { getConfig } from '../config';
import serviceRegistry from '../utils/service.registry';
import axios from 'axios';

interface TokenPayload {
    userId: string;
    role: string;
    email: string;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if ((req as customRequest).routeInfo?.authorized) {
            logger.info(`Route requires authorization: ${req.method} ${req.path}`, {
                requestId: (req as customRequest).requestId || 'unknown'
            });

            const token = extractTokenFromRequest(req);

            if (!token) {
                logger.warn('Authentication failed: No token provided', {
                    requestId: (req as customRequest).requestId || 'unknown',
                    path: req.originalUrl
                });

                res.status(401).json({
                    message: 'Authentication required',
                    status: 'UNAUTHORIZED',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            //make an axios request to the auth service to validate the token
            const { data } = await axios.get(`${serviceRegistry.auth}/api/auth/verify-token`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const decoded = data.data as TokenPayload;

            // Add user data to request object for downstream use
            (req as customRequest).user = {
                id: decoded.userId,
                role: decoded.role,
                email: decoded.email
            };


            // Add user info to headers for microservices
            req.headers['x-auth-user-id'] = decoded.userId;
            req.headers['x-auth-user-role'] = decoded.role;
            req.headers['x-auth-user-email'] = decoded.email;

            logger.info('Authentication successful', {
                requestId: (req as customRequest).requestId || 'unknown',
                userId: decoded.userId,
                role: decoded.role,
                path: req.originalUrl
            });

            next();
        } else {
            logger.info(`Route is public: ${req.method} ${req.path}`, {
                requestId: (req as customRequest).requestId || 'unknown'
            });
            return next();
        }
    } catch (error) {
        const err = error as Error;

        if (err.name === 'TokenExpiredError') {
            logger.warn('Authentication failed: Token expired', {
                requestId: (req as customRequest).requestId || 'unknown',
                path: req.originalUrl
            });

            res.status(401).json({
                message: 'Token expired',
                status: 'UNAUTHORIZED',
                timestamp: new Date().toISOString()
            });
            return;
        }

        logger.error('Authentication error', {
            requestId: (req as customRequest).requestId || 'unknown',
            error: err.message,
            path: req.originalUrl
        });

        res.status(401).json({
            message: 'Invalid authentication token',
            status: 'UNAUTHORIZED',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Extract token from various request locations 
 * (Authorization header, query param, or cookie)
 */
function extractTokenFromRequest(req: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check query parameter
    if (req.query && req.query.token) {
        return req.query.token as string;
    }

    // Check cookies
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }

    return null;
}

export default authMiddleware;