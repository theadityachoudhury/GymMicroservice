// src/middleware/logger.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
// Middleware to log incoming requests and responses
// This middleware logs the request method, URL, IP address, and user agent
// It also logs the response status code and duration of the request
// It generates a unique request ID for each request and attaches it to the request object
// and response headers for debugging purposes
// It uses the logger instance to log the information at different levels (info, error, warn)

// Generate a unique request ID
const generateRequestId = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

export const requestLogger = (req: any, res: Response, next: NextFunction) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Attach requestId to the request object
    req['requestId'] = requestId;

    // Add requestId to response headers for debugging
    res.setHeader('X-Request-ID', requestId);

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