// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { customRequest } from '../types';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Log error with request details
    logger.error(`Error processing request`, {
        requestId: (req as customRequest).requestId,
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        body: req.body
    });

    // Send error response
    res.status(err.status || 500).json({
        message: err.message || 'Something went wrong!',
        requestId: (req as customRequest).requestId // Include request ID for tracking
    });
};