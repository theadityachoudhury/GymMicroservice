import mongoose, { Types } from 'mongoose';
import { HttpError } from '../utils/http-error';
import { ClientProfileUpdateData, CoachProfileUpdateData, AdminProfileUpdateData } from '../types/profile.types';
import logger from '../config/logger';
import { string } from 'zod';
import { Admin, AdminDataModel, Client, ClientDataModel, Coach, CoachDataModel, User, WorkoutModel } from '../models/user.model';

export class ProfileUpdateService {
    /**
     * Update client profile
     */
    async updateClientProfile(userId: string, updateData: Partial<ClientProfileUpdateData>): Promise<any> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            logger.info('Updating client profile', { userId });
            // Find the client user
            const clientUser = await Client.findById(userId).session(session);

            if (!clientUser || !clientUser.clientId) {
                logger.warn('Client not found', { userId });
                await session.abortTransaction();
                session.endSession();
                throw new HttpError(404, 'Client not found');
            }

            // Update base user fields if provided
            if (updateData.firstName || updateData.lastName || updateData.image) {
                const updateFields: Partial<any> = {};

                if (updateData.firstName) updateFields.firstName = updateData.firstName;
                if (updateData.lastName) updateFields.lastName = updateData.lastName;
                if (updateData.image) updateFields.image = updateData.image;

                await User.updateOne(
                    { _id: clientUser._id },
                    { $set: updateFields }
                ).session(session);

                logger.info('Updated client base user fields', { userId });
            }

            // Update client-specific fields if provided
            if (updateData.target || updateData.preferredActivity) {
                const updateFields: Partial<any> = {};

                if (updateData.target) updateFields.target = updateData.target;
                if (updateData.preferredActivity) updateFields.preferredActivity = updateData.preferredActivity;

                await ClientDataModel.updateOne(
                    { _id: clientUser.clientId },
                    { $set: updateFields }
                ).session(session);

                logger.info('Updated client specific fields', { userId });
            }

            await session.commitTransaction();
            session.endSession();

            // Return updated profile
            return await this.getUpdatedClientProfile(userId);
        } catch (error) {
            logger.error('Error updating client profile', error as Error);
            await session.abortTransaction();
            session.endSession();

            if (error instanceof HttpError) throw error;

            throw new HttpError(500, 'Failed to update client profile');
        }
    }

    /**
     * Update coach profile
     */
    async updateCoachProfile(userId: string, updateData: Partial<CoachProfileUpdateData>): Promise<any> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            logger.info('Updating coach profile', { userId });

            console.log(updateData);

            // Find the coach user
            const coachUser = await Coach.findById(userId).session(session);

            if (!coachUser || !coachUser.coachId) {
                logger.warn('Coach not found', { userId });
                await session.abortTransaction();
                session.endSession();
                throw new HttpError(404, 'Coach not found');
            }

            // Update base user fields if provided
            if (updateData.firstName || updateData.lastName || updateData.image) {
                const updateFields: Partial<any> = {};

                if (updateData.firstName) updateFields.firstName = updateData.firstName;
                if (updateData.lastName) updateFields.lastName = updateData.lastName;
                if (updateData.image) updateFields.image = updateData.image;

                await User.updateOne(
                    { _id: coachUser._id },
                    { $set: updateFields }
                ).session(session);

                logger.info('Updated coach base user fields', { userId });
            }

            // Update coach-specific fields if provided
            const coachUpdateFields: Partial<any> = {};
            let hasCoachUpdates = false;

            if (updateData.title) {
                coachUpdateFields.title = updateData.title;
                hasCoachUpdates = true;
            }

            if (updateData.about) {
                coachUpdateFields.about = updateData.about;
                hasCoachUpdates = true;
            }

            if (updateData.specialization?.length) {
                const coachData = await CoachDataModel.findById(coachUser.coachId)
                    .select("specialization")
                    .session(session);

                if (!coachData) {
                    throw new HttpError(404, 'Coach data not found');
                }

                const existingSpecializations = coachData.specialization.map((id: any) => id.toString());
                const newSpecializations = updateData.specialization.map(id => id.toString());

                const removedSpecializations = existingSpecializations.filter(
                    (id: string) => !newSpecializations.includes(id)
                );

                // Convert new list to ObjectIds for update
                coachUpdateFields.specialization = updateData.specialization;
                hasCoachUpdates = true;

                // Delete WorkoutModel documents for removed specializations
                if (removedSpecializations.length > 0) {
                    await WorkoutModel.deleteMany(
                        {
                            workoutType: { $in: removedSpecializations.map((id: string) => new Types.ObjectId(id)) },
                            coachId: coachUser._id,
                        },
                        { session }
                    );
                }
            }

            if (updateData.certificates?.length) {
                coachUpdateFields.certificates = updateData.certificates;
                hasCoachUpdates = true;
            }

            if (updateData.workingDays) {
                coachUpdateFields.workingDays = updateData.workingDays;
                hasCoachUpdates = true;
            }

            if (hasCoachUpdates) {
                await CoachDataModel.updateOne(
                    { _id: coachUser.coachId },
                    { $set: coachUpdateFields }
                ).session(session);

                logger.info('Updated coach specific fields', { userId });
            }

            await session.commitTransaction();
            session.endSession();

            // Return updated profile
            return await this.getUpdatedCoachProfile(userId);

        } catch (error) {
            logger.error('Error updating coach profile', error as Error);
            await session.abortTransaction();
            session.endSession();

            if (error instanceof HttpError) throw error;

            throw new HttpError(500, 'Failed to update coach profile');
        }
    }

    /**
     * Update admin profile
     */
    async updateAdminProfile(userId: string, updateData: Partial<AdminProfileUpdateData>): Promise<any> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            logger.info('Updating admin profile', { userId });
            const { Admin, AdminDataModel, User } = require('../models');

            // Find the admin user
            const adminUser = await Admin.findById(userId).session(session);

            if (!adminUser || !adminUser.adminId) {
                logger.warn('Admin not found', { userId });
                await session.abortTransaction();
                session.endSession();
                throw new HttpError(404, 'Admin not found');
            }

            // Update base user fields if provided
            if (updateData.firstName || updateData.lastName || updateData.image) {
                const updateFields: Partial<any> = {};

                if (updateData.firstName) updateFields.firstName = updateData.firstName;
                if (updateData.lastName) updateFields.lastName = updateData.lastName;
                if (updateData.image) updateFields.image = updateData.image;

                await User.updateOne(
                    { _id: adminUser._id },
                    { $set: updateFields }
                ).session(session);

                logger.info('Updated admin base user fields', { userId });
            }

            // Update admin-specific fields if provided
            if (updateData.phoneNumber) {
                await AdminDataModel.updateOne(
                    { _id: adminUser.adminId },
                    { $set: { phoneNumber: updateData.phoneNumber } }
                ).session(session);

                logger.info('Updated admin specific fields', { userId });
            }

            await session.commitTransaction();
            session.endSession();

            // Return updated profile
            return await this.getUpdatedAdminProfile(userId);
        } catch (error) {
            logger.error('Error updating admin profile', error as Error);
            await session.abortTransaction();
            session.endSession();

            if (error instanceof HttpError) throw error;

            throw new HttpError(500, 'Failed to update admin profile');
        }
    }

    /**
     * Get updated client profile
     */
    private async getUpdatedClientProfile(userId: string): Promise<any> {
        try {

            // Find the client user
            const clientUser = await Client.findById(userId);

            if (!clientUser || !clientUser.clientId) {
                throw new HttpError(404, 'Client not found');
            }

            // Fetch client details
            const clientData = await ClientDataModel.findById(clientUser.clientId);

            if (!clientData) {
                throw new HttpError(404, 'Client details not found');
            }

            // Return combined profile
            return {
                id: clientUser._id,
                firstName: clientUser.firstName,
                lastName: clientUser.lastName,
                email: clientUser.email,
                role: clientUser.role,
                gym: clientUser.gym,
                image: clientUser.image,
                target: clientData.target,
                preferredActivity: clientData.preferredActivity
            };
        } catch (error) {
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, 'Failed to retrieve updated client profile');
        }
    }

    /**
     * Get updated coach profile
     */
    private async getUpdatedCoachProfile(userId: string): Promise<any> {
        try {

            // Find the coach user
            const coachUser = await Coach.findById(userId);
            console.log(coachUser);

            if (!coachUser || !coachUser.coachId) {
                throw new HttpError(404, 'Coach not found');
            }

            // Fetch coach details with populated specializations and certificates
            const coachData = await CoachDataModel.findById(coachUser.coachId).populate('specialization')

            if (!coachData) {
                throw new HttpError(404, 'Coach details not found');
            }

            // Return combined profile
            return {
                id: coachUser._id,
                firstName: coachUser.firstName,
                lastName: coachUser.lastName,
                email: coachUser.email,
                role: coachUser.role,
                gym: coachUser.gym,
                image: coachUser.image,
                specialization: coachData.specialization.map((spec: any) => ({
                    label: spec.name,
                    value: spec._id.toString(),
                })),
                title: coachData.title,
                about: coachData.about,
                rating: coachData.rating,
                certificates: coachData.certificates,
                workingDays: coachData.workingDays,
            };
        } catch (error) {
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, 'Failed to retrieve updated coach profile');
        }
    }

    /**
     * Get updated admin profile
     */
    private async getUpdatedAdminProfile(userId: string): Promise<any> {
        try {

            // Find the admin user
            const adminUser = await Admin.findById(userId);

            if (!adminUser || !adminUser.adminId) {
                throw new HttpError(404, 'Admin not found');
            }

            // Fetch admin details
            const adminData = await AdminDataModel.findById(adminUser.adminId);

            if (!adminData) {
                throw new HttpError(404, 'Admin details not found');
            }

            // Return combined profile
            return {
                id: adminUser._id,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                email: adminUser.email,
                role: adminUser.role,
                image: adminUser.image,
                phoneNumber: adminData.phoneNumber,
            };
        } catch (error) {
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, 'Failed to retrieve updated admin profile');
        }
    }
}