import { Request, Response, NextFunction } from 'express';
import { CoachService } from '../services/coach.service';
import HttpError from '../utils/http-error';
import { AuthRequest, UserRole } from '../types/user.type';
import { Types } from 'mongoose';
import logger from '../config/logger';

export class CoachController {
    private coachService: CoachService;

    constructor() {
        this.coachService = new CoachService();
    }

    /**
     * Get all coaches
     */
    async getAllCoaches(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Request to get all coaches');
            const coaches = await this.coachService.getAllCoaches();

            res.status(200).json({
                status: 'success',
                data: coaches
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get coach by ID
     */
    async getCoachById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            logger.info(`Request to get coach by ID: ${id}`);

            const coach = await this.coachService.getCoachById(id);

            res.status(200).json({
                status: 'success',
                data: coach
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get coach available time slots
     */
    async getCoachAvailableTimeSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { date } = req.query;
            console.log(req.query);


            logger.info(`Request to get available time slots for coach: ${id}, date: ${date}`);

            if (!date || typeof date !== 'string') {
                throw new HttpError(400, 'Date parameter is required');
            }

            const timeSlots = await this.coachService.getCoachAvailableTimeSlots(
                new Types.ObjectId(id),
                new Date(date)
            );

            res.status(200).json({
                status: 'success',
                data: timeSlots
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user bookings for a specific day
     */
    async getUserBookingsForDay(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.headers['x-auth-user-id'] as string;
            const userRole = req.headers['x-auth-user-role'] as string;
            const { date } = req.query;



            logger.info(`Request to get bookings for user: ${userId}, date: ${date}`);

            if (!userId || !userRole) {
                throw new HttpError(401, 'Authentication required');
            }

            if (!date || typeof date !== 'string') {
                throw new HttpError(400, 'Date parameter is required');
            }

            const bookings = await this.coachService.getUserBookingsForDay(
                new Types.ObjectId(userId),
                new Date(date),
                userRole as UserRole
            );

            res.status(200).json({
                status: 'success',
                data: bookings
            });
        } catch (error) {
            console.log(error);

            next(error);
        }
    }
}