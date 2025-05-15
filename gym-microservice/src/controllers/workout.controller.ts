import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { WorkoutService } from '../services/workout.service';
import HttpError from '../utils/http-error';
import logger from '../config/logger';
import { AuthRequest } from '../types/user.type';

// Validation schemas
const bookWorkoutSchema = z.object({
    workoutId: z.string().refine(val => Types.ObjectId.isValid(val), {
        message: 'Invalid workout ID format'
    }),
    coachId: z.string().refine(val => Types.ObjectId.isValid(val), {
        message: 'Invalid coach ID format'
    }),
    timeSlotId: z.string().refine(val => Types.ObjectId.isValid(val), {
        message: 'Invalid time slot ID format'
    }),
    date: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: 'Invalid date format'
    })
});

const cancelWorkoutSchema = z.object({
    bookingId: z.string().refine(val => Types.ObjectId.isValid(val), {
        message: 'Invalid booking ID format'
    })
});

const createWorkoutSchema = z.object({
    name: z.string().min(1, 'Workout name is required')
});

const mapWorkoutsSchema = z.object({
    workoutIds: z.array(z.string().refine(val => Types.ObjectId.isValid(val), {
        message: 'Invalid workout ID format'
    }))
});

const workoutFilterSchema = z.object({
    workoutId: z.string().optional(),
    coachId: z.string().optional(),
    timeSlotId: z.string().optional(),
    date: z.string().optional().transform(val => val ? new Date(val) : undefined)
});
type SelectOption = {
    value: string;
    label: string;
};


export class WorkoutController {
    private workoutService: WorkoutService;

    constructor() {
        this.workoutService = new WorkoutService();
    }

    /**
     * Map workouts to a coach
     */
    async mapWorkoutsToCoach(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to map workouts to coach');
            const userId = req.headers['x-auth-user-id'] as string;

            // Ensure user is authenticated
            if (!userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = mapWorkoutsSchema.parse(req.body);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    throw new HttpError(400, 'Validation failed', zodError.errors);
                }
                throw zodError;
            }

            // Map workouts to coach
            const data = await this.workoutService.createMappings(
                userId,
                validatedData.workoutIds
            );

            res.status(200).json({
                status: 'success',
                message: 'Workouts mapped to coach successfully',
                data
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get coaches for a specific workout
     */
    async fetchCoachesForWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            logger.info(`Request to get coaches for workout: ${id}`);

            if (!Types.ObjectId.isValid(id)) {
                throw new HttpError(400, 'Invalid workout ID format');
            }

            const coaches = await this.workoutService.getCoachesByWorkout(id);

            res.status(200).json({
                status: 'success',
                data: coaches
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Book a workout
     */
    async bookWorkout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to book workout');
            const userId = req.headers['x-auth-user-id'] as string;

            // Ensure user is authenticated
            if (!userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = bookWorkoutSchema.parse(req.body);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    throw new HttpError(400, 'Validation failed', zodError.errors);
                }
                throw zodError;
            }

            // Book workout
            const booking = await this.workoutService.bookWorkout({
                clientId: userId,
                workoutId: validatedData.workoutId,
                coachId: validatedData.coachId,
                timeSlotId: validatedData.timeSlotId,
                date: new Date(validatedData.date)
            });

            res.status(201).json({
                status: 'success',
                message: 'Workout booked successfully',
                data: booking
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel a workout booking
     */
    async cancelWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to cancel workout');
            const userId = req.headers['x-auth-user-id'] as string;

            // Ensure user is authenticated
            if (!userId) {
                throw new HttpError(401, 'Authentication required');
            }

            const { workoutId } = req.params

            // Cancel booking
            const result = await this.workoutService.cancelBooking({
                userId: new Types.ObjectId(userId),
                bookingId: new Types.ObjectId(workoutId)
            });

            res.status(200).json({
                status: 'success',
                message: 'Workout cancelled successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all bookings for authenticated user
     */
    async getUserBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to get user bookings');
            const userId = req.headers['x-auth-user-id'] as string;
            // Ensure user is authenticated
            if (!userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Get bookings
            const bookings = await this.workoutService.getAllBookingsForUser({
                userId: new Types.ObjectId(userId)
            });

            res.status(200).json({
                status: 'success',
                data: bookings
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new workout option
     */
    async createWorkoutOption(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to create workout option');

            // Validate request body
            let validatedData;
            try {
                validatedData = createWorkoutSchema.parse(req.body);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    throw new HttpError(400, 'Validation failed', zodError.errors);
                }
                throw zodError;
            }

            // Create workout option
            const workoutOption = await this.workoutService.createWorkoutOption(validatedData.name);

            res.status(201).json({
                status: 'success',
                message: 'Workout option created successfully',
                data: workoutOption
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all workout options
     */
    async getAllWorkoutOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to get all workout options');

            const data = await this.workoutService.getAllWorkoutOptions();

            const workoutOptions: SelectOption[] = data.map((option: any) => ({
                value: option._id,
                label: option.name
            }));

            // Flatten all coaches arrays, filter out nulls, remove duplicates by _id
            const allCoaches = data
                .flatMap((option: any) => option.coaches || [])
                .filter((coach: any): coach is any => coach !== null);

            // Remove duplicate coaches by _id
            const uniqueCoachesMap = new Map<string, SelectOption>();
            for (const coach of allCoaches) {
                if (!uniqueCoachesMap.has(coach._id)) {
                    uniqueCoachesMap.set(coach._id, {
                        value: coach._id,
                        label: `${coach.firstName} ${coach.lastName}`
                    });
                }
            }

            const coachOptions: SelectOption[] = Array.from(uniqueCoachesMap.values());

            res.status(200).json({
                status: 'success',
                data: { workoutOptions, coachOptions }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get coaches filtered by workout, time slot, and date
     */
    async getFilteredCoaches(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to get filtered coaches');

            // Validate request query
            let validatedQuery;
            try {
                validatedQuery = workoutFilterSchema.parse(req.query);
            } catch (zodError) {
                if (zodError instanceof z.ZodError) {
                    throw new HttpError(400, 'Invalid query parameters', zodError.errors);
                }
                throw zodError;
            }

            // Get filtered coaches
            const coaches = await this.workoutService.searchWorkoutUsingFilters(validatedQuery);

            res.status(200).json({
                status: 'success',
                data: coaches
            });
        } catch (error) {
            console.log(error);

            next(error);
        }
    }
}