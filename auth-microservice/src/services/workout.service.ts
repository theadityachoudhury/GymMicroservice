import { Types } from "mongoose";
import logger from "../config/logger";
import { WorkoutModel, WorkoutOption } from "../models/user.model";
import axios from "axios";
import serviceRegistry from "../utils/service.registry";



export class WorkoutService {
    async createMappings(coachId: string, workoutIds: string[]) {
        const session = await WorkoutModel.startSession();

        try {
            const { data } = await axios.post(
                `${serviceRegistry.gym}/api/workouts/map-to-coach`,
                { workoutIds }, // Body
                {
                    headers: {
                        'x-auth-user-id': coachId
                    }
                }
            );
            return data.data;
        } catch (error) {
            if (error instanceof axios.AxiosError) {
                logger.error("Error creating workout mappings", error.response?.data);
                throw error;
            }
            logger.error("Error creating workout mappings", (error as Error).message);
            throw error;
        }
    }


    async getWorkoutOptions(coachId: string) {
        const session = await WorkoutModel.startSession();

        try {
            const { data } = await axios.get(
                `${serviceRegistry.gym}/api/workouts/workout-options`,
                {
                    headers: {
                        'x-auth-user-id': coachId
                    }
                }
            );
            return data.data.workoutOptions;
        } catch (error) {
            if (error instanceof axios.AxiosError) {
                logger.error("Error getting workout options", error.response?.data);
                throw error;
            }
            logger.error("Error getting workout options", (error as Error).message);
            throw error;
        }
    }
}