import mongoose from 'mongoose';

export interface ClientProfileUpdateData {
    firstName?: string;
    lastName?: string;
    image?: string;
    target?: string;
    preferredActivity?: string;
}

export interface CoachProfileUpdateData {
    firstName?: string;
    lastName?: string;
    image?: string;
    title?: string;
    about?: string;
    specialization?: mongoose.Types.ObjectId[];
    certificates?: mongoose.Types.ObjectId[];
    workingDays?: string[];
}

export interface AdminProfileUpdateData {
    firstName?: string;
    lastName?: string;
    image?: string;
    phoneNumber?: number;
}