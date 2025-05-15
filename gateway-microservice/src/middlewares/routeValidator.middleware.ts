// src/middlewares/routeValidator.ts
import { NextFunction, Request, Response } from 'express';
import isRouteAvailable from '../utils/routes.registry';
import logger from '../config/logger';
import { customRequest } from '../types';
import authMiddleware from './auth.middleware';

const routeValidator = (req: Request, res: Response, next: NextFunction): any => {
    const { method, path, originalUrl } = req;
    logger.debug(`Validating route: ${method} ${path}`);

    const routeInfo = isRouteAvailable(method, originalUrl);

    if (!routeInfo) {
        logger.warn(`Route not found: ${method} ${originalUrl}`, {
            requestId: (req as customRequest).requestId || 'unknown',
            method,
            url: originalUrl
        });

        return res.status(404).json({
            message: 'Route not found',
            timestamp: new Date().toLocaleString(),
            status: 'NOT_FOUND'
        });
    }

    // Store route info on request for later use in proxying
    (req as customRequest).routeInfo = routeInfo;

    next();
};

export default routeValidator;