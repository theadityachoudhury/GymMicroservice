import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AuthRequest } from '../types/user.type';

// Generate a unique request ID
const generateRequestId = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    console.log("req user looging ----------------", (req as any).user);

    const requestId = generateRequestId();
    const startTime = Date.now();

    // Attach requestId to the request object
    res.locals.requestId = requestId;
    // Add requestId to response headers for debugging
    res.setHeader('X-Request-ID', requestId);
    console.log(req.query);

    // Log request
    logger.info(`Incoming request`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'error' : 'info';

        logger[level](`Request completed`, {
            requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};