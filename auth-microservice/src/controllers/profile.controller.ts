import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http-error';
import { z } from 'zod';
import mongoose, { Types } from 'mongoose';
import { ClientProfileUpdateData, CoachProfileUpdateData, AdminProfileUpdateData } from '../types/profile.types';
import { AuthRequest } from '../middlewares/auth.middleware';
import logger from '../config/logger';
import { Admin, AdminDataModel, Client, ClientDataModel, Coach, CoachDataModel } from '../models/user.model';
import { ProfileUpdateService } from '../services/profile.service';
import { WorkoutService } from '../services/workout.service';

// Schema for client profile update validation
const clientProfileUpdateSchema = z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    image: z.string().optional(),
    target: z.string().min(1, 'Target is required').optional(),
    preferredActivity: z.string().min(1, 'Preferred activity is required').optional()
});

// Schema for coach profile update validation
const coachProfileUpdateSchema = z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    image: z.string().optional(),
    title: z.string().optional(),
    about: z.string().optional(),
    specialization: z.array(z.string()).optional(),
    certificates: z.array(z.string()).optional(),
    workingDays: z.array(z.string()).optional()
});

// Schema for admin profile update validation
const adminProfileUpdateSchema = z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    image: z.string().optional(),
    phoneNumber: z.number().optional()
});

export class ProfileController {
    /**
     * Get client profile
     */
    async getClientProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Client profile request received');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Get user profile from database

            const client = await Client.findById(req.userId)
                .select('-password -refreshToken');

            if (!client) {
                throw new HttpError(404, 'Client profile not found');
            }

            const clientData = await ClientDataModel.findById(client.clientId);

            if (!clientData) {
                throw new HttpError(404, 'Client details not found');
            }

            // Return profile data
            res.status(200).json({
                status: 'success',
                data: {
                    id: client._id,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    email: client.email,
                    role: client.role,
                    gym: client.gym,
                    image: client.image,
                    target: clientData.target,
                    preferredActivity: clientData.preferredActivity
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get coach profile
     */
    async getCoachProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Coach profile request received');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Get user profile from database

            const coach = await Coach.findById(req.userId)
                .select('-password -refreshToken');

            if (!coach) {
                throw new HttpError(404, 'Coach profile not found');
            }

            const coachData = await CoachDataModel.findById(coach.coachId)
                .populate('specialization')

            if (!coachData) {
                throw new HttpError(404, 'Coach details not found');
            }

            // Return profile data
            res.status(200).json({
                status: 'success',
                data: {
                    id: coach._id,
                    firstName: coach.firstName,
                    lastName: coach.lastName,
                    email: coach.email,
                    role: coach.role,
                    gym: coach.gym,
                    image: coach.image,
                    specialization: coachData.specialization.map((spec: any) => ({
                        label: spec.name,
                        value: spec._id.toString(),
                    })),
                    title: coachData.title,
                    about: coachData.about,
                    rating: coachData.rating,
                    certificates: coachData.certificates,
                    workingDays: coachData.workingDays,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get admin profile
     */
    async getAdminProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Admin profile request received');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Get user profile from database

            const admin = await Admin.findById(req.userId)
                .select('-password -refreshToken');

            if (!admin) {
                throw new HttpError(404, 'Admin profile not found');
            }

            const adminData = await AdminDataModel.findById(admin.adminId);

            if (!adminData) {
                throw new HttpError(404, 'Admin details not found');
            }

            // Return profile data
            res.status(200).json({
                status: 'success',
                data: {
                    id: admin._id,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    email: admin.email,
                    role: admin.role,
                    image: admin.image,
                    phoneNumber: adminData.phoneNumber,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update client profile
     */
    async updateClientProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Client profile update request received');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            console.log(req.body);

            // Validate request body
            let validatedData;
            try {
                validatedData = clientProfileUpdateSchema.parse(req.body);
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
            console.log(validatedData);
            if (Object.keys(validatedData).length === 0) {
                throw new HttpError(400, "req body is empty")
            }

            // Update profile
            const profileUpdateService = new ProfileUpdateService();
            const updatedProfile = await profileUpdateService.updateClientProfile(req.userId, validatedData);

            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: updatedProfile
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update coach profile
     */
    async updateCoachProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Coach profile update request received');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = coachProfileUpdateSchema.parse(req.body);
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

            logger.info("Parsed validated data", validatedData);

            // Validate ObjectIds
            if (validatedData.specialization?.some(id => !Types.ObjectId.isValid(id))) {
                throw new HttpError(400, 'One or more specialization IDs are invalid');
            }

            if (validatedData.certificates?.some(id => !Types.ObjectId.isValid(id))) {
                throw new HttpError(400, 'One or more certificate IDs are invalid');
            }


            // Create mappings for specializations
            if (validatedData.specialization?.length) {
                const workoutService = new WorkoutService();
                await workoutService.createMappings(req.userId, validatedData.specialization);
            }


            // Update profile
            const profileUpdateService = new ProfileUpdateService();

            const coachUpdateData: CoachProfileUpdateData = {
                ...validatedData,
                specialization: validatedData.specialization
                    ? validatedData.specialization as any[]
                    : undefined,
                certificates: validatedData.certificates
                    ? validatedData.certificates
                        .filter(Types.ObjectId.isValid)
                        .map(id => new Types.ObjectId(id))
                    : undefined,
            };


            console.log(req.userId);

            const updatedProfile = await profileUpdateService.updateCoachProfile(req.userId, coachUpdateData);

            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: updatedProfile
            });
        } catch (error) {
            console.log(error);

            next(error);
        }
    }

    /**
     * Update admin profile
     */
    async updateAdminProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            logger.info('Admin profile update request received');

            // Ensure user is authenticated
            if (!req.userId) {
                throw new HttpError(401, 'Authentication required');
            }

            // Validate request body
            let validatedData;
            try {
                validatedData = adminProfileUpdateSchema.parse(req.body);
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

            // Update profile
            const profileUpdateService = new ProfileUpdateService();
            const updatedProfile = await profileUpdateService.updateAdminProfile(req.userId, validatedData);

            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: updatedProfile
            });
        } catch (error) {
            next(error);
        }
    }
}