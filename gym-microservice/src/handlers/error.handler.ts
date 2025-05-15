import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import HttpError from '../utils/http-error';
import logger from '../config/logger';

export const handleError = (
    err: Error | HttpError | ZodError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Default values
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    let errors = undefined;

    // Handle HttpError
    if (err instanceof HttpError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = true;
        errors = err.errors;
    }
    // Handle ZodError
    else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed';
        isOperational = true;
        errors = err.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
        }));
    }

    // Create a structured error log
    const errorLog = {
        requestId: req.headers['x-request-id'] || '',
        url: req.originalUrl,
        method: req.method,
        statusCode,
        message,
        errors: errors,
        stack: err.stack,
        isOperational,
        requestBody: statusCode === 400 ? JSON.stringify(req.body) : undefined
    };

    // Log with appropriate level
    if (statusCode >= 500) {
        logger.error(`Server error: ${message}`, errorLog);
    } else if (statusCode >= 400) {
        logger.warn(`Client error: ${message}`, errorLog);
    } else {
        logger.info(`Error: ${message}`, errorLog);
    }

    // Send appropriate response to client
    res.status(statusCode).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' && !isOperational
            ? 'Something went wrong'
            : message,
        errors: errors
    });
};