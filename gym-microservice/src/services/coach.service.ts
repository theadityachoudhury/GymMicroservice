// src/services/coach.service.ts
import logger from "../config/logger";
import { BookingModel, BookingStateEnum } from "../models/bookings.model";
import { TimeSlotModel } from "../models/timeSlot.model";
import { WorkoutOption } from "../models/workout_options.model";
import HttpError from "../utils/http-error";
import { DatabaseService } from "./database.service";
// Import WorkoutOption model to ensure it's registered
import mongoose, { Types } from "mongoose";
import { WorkoutService } from "./workout.service";
import { UserRole } from "../types/user.type";
import { UserService } from "./user.service";

export class CoachService {
    private dbService: DatabaseService;
    private workoutService: WorkoutService;
    private userService: UserService;

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.workoutService = new WorkoutService();
        this.userService = UserService.getInstance();
    }

    /**
     * Get all coaches with their details
     */
    async getAllCoaches(): Promise<any[]> {
        try {
            await this.dbService.connect();

            // Get all coaches from userService
            const coaches = await this.userService.getAllCoaches();

            // Collect all specialization IDs from all coach.coachId.specialization
            const allSpecializationIds: string[] = [];
            for (const coach of coaches) {
                const specIds = coach.coachId?.specialization || [];
                allSpecializationIds.push(...specIds);
            }

            // Fetch all specializations
            const specializations = await WorkoutOption.find({
                _id: { $in: allSpecializationIds },
            }).lean();

            // Map specialization IDs to objects for quick access
            const specializationsMap = new Map();
            specializations.forEach((spec) => {
                specializationsMap.set(spec._id.toString(), spec);
            });

            // Format coaches response
            return coaches.map((coach: any) => {
                const coachDetail = coach.coachId;

                // Map coach's specialization
                const coachSpecializations = (coachDetail?.specialization || [])
                    .map((specId: any) => {
                        const spec = specializationsMap.get(specId.toString());
                        return spec ? { _id: spec._id, name: spec.name } : null;
                    })
                    .filter(Boolean);

                return {
                    id: coach._id,
                    firstName: coach.firstName,
                    lastName: coach.lastName,
                    email: coach.email,
                    image: coach.image || "",
                    gym: coach.gym,
                    specialization: coachSpecializations,
                    title: coachDetail?.title || "",
                    about: coachDetail?.about || "",
                    rating: coachDetail?.rating || 0,
                    workingDays: coachDetail?.workingDays || [],
                };
            });
        } catch (error) {
            logger.error("Error fetching all coaches", error as Error);
            throw new HttpError(500, "Failed to fetch coaches");
        }
    }


    /**
     * Get coach profile by ID with specializations
     */
    async getCoachById(coachId: string): Promise<any> {
        try {
            await this.dbService.connect();

            if (!mongoose.Types.ObjectId.isValid(coachId)) {
                throw new HttpError(400, "Invalid coach ID format");
            }

            // First get the coach user
            const coach = await this.userService.getCoachData(coachId);
            if (!coach) {
                throw new HttpError(404, "Coach not found");
            }

            // Get specializations separately if needed
            let specializations: any = [];
            if (
                coach.coachId &&
                coach.coachId?.specialization &&
                coach.coachId?.specialization.length > 0
            ) {
                specializations = await WorkoutOption.find({
                    _id: { $in: coach.coachId?.specialization },
                }).lean();
            }

            // Get certificates separately if needed
            let certificates: any = [];
            if (
                coach.coachId &&
                coach.coachId?.certificates &&
                coach.coachId?.certificates.length > 0
            ) {
                // Assuming you have a Certificate model
                // certificates = await Certificate.find({
                //   _id: { $in: coachDetails.certificates }
                // }).lean();

                // If you don't have a Certificate model yet, use this placeholder
                certificates = coach.coachId?.certificates;
            }

            // Combine the data
            return {
                id: coach._id,
                firstName: coach.firstName,
                lastName: coach.lastName,
                email: coach.email,
                image: coach.image || "",
                gym: coach.gym,
                specialization: specializations,
                title: coach.coachId?.title || "",
                about: coach.coachId?.about || "",
                rating: coach.coachId?.rating || 0,
                certificates: certificates,
                workingDays: coach.coachId?.workingDays || [],
            };
        } catch (error) {
            if (error instanceof HttpError) throw error;
            logger.error("Error fetching coach by ID", error as Error);
            throw new HttpError(500, "Failed to fetch coach details");
        }
    }

    /**
     * Get available time slots for a coach on a specific date
     */
    async getCoachAvailableTimeSlots(
        coachId: Types.ObjectId,
        date: Date
    ): Promise<any[]> {
        try {

            if (!mongoose.Types.ObjectId.isValid(coachId)) {
                throw new HttpError(400, "Invalid coach ID format");
            }

            // Parse and validate date
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                throw new HttpError(400, "Invalid date format");
            }

            // Find the coach to check working days
            const coach = await this.userService.getCoachData(coachId.toString());
            if (!coach) {
                throw new HttpError(404, "Coach not found");
            }

            // Check if the coach works on this day (assuming coach has workingDays property)
            // const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            // if (coach.workingDays && !coach.workingDays.includes(dayOfWeek)) {
            //   return []; // Coach doesn't work on this day
            // }

            // Get all the time slots
            const timeSlots = await TimeSlotModel.find();
            console.log(timeSlots)
            if (!timeSlots || timeSlots.length === 0) {
                throw new HttpError(404, "No time slots available");
            }

            // Get all the bookings for this date for this coach
            const bookings = await BookingModel.find({
                coachId: coachId,
                date: date,
                state: {
                    $in: [
                        BookingStateEnum.SCHEDULED,
                        BookingStateEnum.COMPLETED,
                        BookingStateEnum.WAITING_FOR_FEEDBACK
                    ]
                }
            });

            console.log("Bookings for the date", bookings);

            // Make a new array and add a new field called isBooked to each time slot
            const slotsWithBookingStatus = timeSlots.map((slot: any) => {
                const isBooked = bookings.some(
                    (booking: any) =>
                        booking.timeSlotId.toString() === slot._id.toString() &&
                        [
                            BookingStateEnum.SCHEDULED,
                            BookingStateEnum.COMPLETED,
                            BookingStateEnum.WAITING_FOR_FEEDBACK
                        ].includes(booking.state as BookingStateEnum)
                );

                return {
                    id: slot._id.toString(),
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isBooked: isBooked,
                };
            });

            logger.info("Slots with booking status", slotsWithBookingStatus);
            console.log("Slots with booking status", slotsWithBookingStatus);
            return slotsWithBookingStatus;

        } catch (error) {
            if (error instanceof HttpError) throw error;
            logger.error("Error fetching coach available time slots", error as Error);
            throw new HttpError(500, "Failed to fetch available time slots");
        }
    }

    /**
     * Get bookings for a user on a specific day
     */
    async getUserBookingsForDay(
        userId: Types.ObjectId,
        date: Date,
        role: UserRole
    ): Promise<any[]> {
        try {
            await this.dbService.connect();

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new HttpError(400, "Invalid user ID format");
            }

            // Parse and validate date
            const selectedDate = this.parseAndValidateDate(date);

            // Create date range for the booking day (start and end of day)
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            logger.info("Searching bookings for date range", {
                startOfDay: startOfDay.toISOString(),
                endOfDay: endOfDay.toISOString(),
                userId,
                role,
            });

            if (role === UserRole.Coach) {
                return this.workoutService.getBookingsForUser({ userId, date });
            } else if (role === UserRole.Client) {
                return this.workoutService.getBookingsForUser({ userId, date });
            } else {
                throw new HttpError(403, "Unauthorized access");
            }

            // Get bookings with all necessary populated data

            // Return the raw booking data with all field
        } catch (error) {
            if (error instanceof HttpError) throw error;
            logger.error("Error fetching user bookings for day", error as Error);
            throw new HttpError(500, "Failed to fetch bookings for day");
        }
    }

    /**
     * Helper method to parse and validate date
     */
    private parseAndValidateDate(date: string | Date): Date {
        let parsedDate: Date;

        // Parse date if it's a string
        if (typeof date === "string") {
            // If date is just a day number
            if (/^\d+$/.test(date)) {
                const today = new Date();
                parsedDate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    parseInt(date)
                );
            }
            // If it's in YYYY-MM-DD format
            else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const [year, month, day] = date.split("-").map(Number);
                parsedDate = new Date(year, month - 1, day); // Month is 0-indexed in JS Date
            }
            // Try standard date parsing
            else {
                parsedDate = new Date(date);
            }
        } else {
            parsedDate = new Date(date);
        }

        // Validate date is valid
        if (isNaN(parsedDate.getTime())) {
            throw new HttpError(400, "Invalid date format");
        }

        logger.info("Parsed date", {
            input: date,
            parsed: parsedDate.toISOString(),
            year: parsedDate.getFullYear(),
            month: parsedDate.getMonth() + 1,
            day: parsedDate.getDate(),
        });

        return parsedDate;
    }
}