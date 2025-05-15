import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to automatically catch errors and pass them to the next middleware
 * This eliminates the need for try/catch blocks in every route handler
 */
type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncFunction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};