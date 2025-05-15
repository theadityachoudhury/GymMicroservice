import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { FeedbackService } from '../services/feedback.service';
import { z } from 'zod';
import HttpError from '../utils/http-error';
import logger from '../config/logger';
import { AuthRequest } from '../types/user.type';

// Validate feedback creation inputs
const addFeedbackSchema = z.object({
    bookingId: z.string().refine(val => Types.ObjectId.isValid(val), {
        message: 'Invalid booking ID format'
    }),
    message: z.string().min(1, 'Feedback message is required'),
    rating: z.number().min(1).max(5).int('Rating must be an integer between 1 and 5')
});

// Validate feedback query parameters
const getFeedbackQuerySchema = z.object({
    perPage: z.string().optional().transform(val => val ? parseInt(val) : 10),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    sortBy: z.string().optional().default('createdAt')
});

export class FeedbackController {
    private feedbackService: FeedbackService;

    constructor() {
        this.feedbackService = new FeedbackService();
    }

    /**
     * Add feedback for a booking
     */
    async addFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to add feedback');

            // Ensure user is authenticated
            const userId = req.headers['x-auth-user-id'] as string;

            if (!userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = addFeedbackSchema.parse(req.body);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    const formattedErrors = zodError.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }));

                    throw new HttpError(400, 'Validation failed', formattedErrors);
                }
                throw zodError;
            }

            // Add feedback
            const feedback = await this.feedbackService.addFeedback({
                userId: new Types.ObjectId(userId),
                bookingId: new Types.ObjectId(validatedData.bookingId),
                message: validatedData.message,
                rating: validatedData.rating
            });

            res.status(201).json({
                status: 'success',
                message: 'Feedback added successfully',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get feedback for a coach with pagination and sorting
     */
    async getFeedbackForCoach(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            if (!Types.ObjectId.isValid(id)) {
                throw new HttpError(400, 'Invalid coach ID format');
            }

            // Validate and transform query parameters
            let validatedQuery;
            try {
                validatedQuery = getFeedbackQuerySchema.parse(req.query);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    throw new HttpError(400, 'Invalid query parameters', zodError.errors);
                }
                throw zodError;
            }

            const { perPage, page, sortBy } = validatedQuery;

            logger.info(`Request to get feedback for coach: ${id}`);

            // Get feedback
            const feedback = await this.feedbackService.getFeedbackForUserCoach(
                new Types.ObjectId(id),
                perPage,
                page,
                sortBy
            );

            res.status(200).json({
                status: 'success',
                data: feedback,
                pagination: {
                    total: feedback.total,
                    page: page,
                    perPage: perPage,
                    totalPages: Math.ceil(feedback.total / perPage)
                }
            });
        } catch (error) {
            next(error);
        }
    }
}