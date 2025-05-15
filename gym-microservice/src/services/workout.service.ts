import { Types } from "mongoose";
import { WorkoutModel } from "../models/workout.model";
import { WorkoutOption } from "../models/workout_options.model";
import logger from "../config/logger";
import HttpError from "../utils/http-error";
import { TimeSlotModel } from "../models/timeSlot.model";
import { BookingModel, BookingStateEnum } from "../models/bookings.model";
import { FeedbackModel } from "../models/feedback.model";
import { UserRole } from "../types/user.type";
import { UserService } from "./user.service";

interface BookWorkoutParams {
  clientId: string;
  workoutId: string;
  coachId: string;
  timeSlotId: string;
  date: Date | string;
}

interface BookingResponse {
  bookingId: string;
  clientId: string;
  coachId: string;
  workoutId: string;
  timeSlotId: string;
  date: Date;
  state: string;
  createdAt: Date;
}

interface FilterOptions {
  workoutId?: string;
  coachId?: string;
  timeSlotId?: string;
  date?: Date;
}

interface TimeSlotInfo {
  startTime: string;
  endTime: string;
  timeSlotId: Types.ObjectId;
}

// Define interfaces for populated fields
interface PopulatedCoach {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  image?: string;
  gym: Types.ObjectId | null;
  coachId: {
    title: string;
    about: string;
    rating: number;
  }
}

interface PopulatedWorkoutType {
  _id: Types.ObjectId;
  name: string;
}

interface PopulatedWorkout {
  _id: Types.ObjectId;
  workoutType: PopulatedWorkoutType;
  coachId: PopulatedCoach;
}

interface CoachWorkoutAvailability {
  coachId: Types.ObjectId;
  firstName: string;
  lastName: string;
  role: string;
  image: string;
  title: string;
  about: string;
  rating: number;
  workoutId: Types.ObjectId;
  activityId: Types.ObjectId;
  workoutName: string;
  timeSlotId: Types.ObjectId | null;
  timeSlot: string | null;
  date: Date;
  alternativeTimeSlots: TimeSlotInfo[];
}

export class WorkoutService {
  private userService: UserService;

  constructor() {
    this.userService = UserService.getInstance();
  }

  async createMappings(coachId: string, workoutIds: string[]) {
    const session = await WorkoutModel.startSession();

    try {
      let saved: any[] = [];

      await session.withTransaction(async () => {
        // 1. Find existing mappings first
        const existingMappings = await WorkoutModel.find({
          coachId: new Types.ObjectId(coachId),
          workoutType: { $in: workoutIds.map(id => new Types.ObjectId(id)) }
        }).session(session).select('workoutType');

        const existingWorkoutIds = existingMappings.map((mapping: any) =>
          mapping.workoutType.toString());

        // 2. Filter workoutIds to only include new ones
        const newWorkoutIds = workoutIds.filter(id =>
          !existingWorkoutIds.includes(id));

        if (newWorkoutIds.length === 0) {
          logger.info(`All mappings already exist for coach ${coachId}`);
          return; // Continue with transaction but don't create any new mappings
        }

        // 3. Create new mappings only for non-existing workoutIds
        const data = newWorkoutIds.map(id => ({
          coachId: new Types.ObjectId(coachId),
          workoutType: new Types.ObjectId(id)
        }));

        saved = await WorkoutModel.insertMany(data, { session });

        // 4. Update WorkoutOption documents
        const updatePromises = newWorkoutIds.map(workoutId =>
          WorkoutOption.findByIdAndUpdate(
            workoutId,
            { $addToSet: { coachesId: coachId } },
            { session }
          )
        );

        await Promise.all(updatePromises);

        logger.info(`Created ${newWorkoutIds.length} new workout mappings for coach ${coachId}`);

        // Log skipped mappings if any
        if (existingWorkoutIds.length > 0) {
          logger.info(`Skipped ${existingWorkoutIds.length} existing mappings for coach ${coachId}`);
        }
      });

      return saved;
    } catch (error) {
      logger.error("Error creating workout mappings", error as Error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createWorkoutOption(name: string) {
    const existing = await WorkoutOption.findOne({ name });
    if (existing) throw new Error("Workout option already exists");

    const workout = new WorkoutOption({ name });
    return await workout.save();
  }

  async getAllWorkoutOptions() {
    const workouts = await WorkoutOption.find();
    //populate coachesId using the user service
    const populatedWorkouts = await Promise.all(
      workouts.map(async (workout: any) => {
        const coaches = await Promise.all(
          workout.coachesId.map(async (coachId: string) => {
            const coach = await this.userService.getCoachData(coachId);
            return coach;
          })
        );
        return { ...workout.toObject(), coaches };
      })
    );
    return populatedWorkouts;
  }

  async getCoachesByWorkout(workoutId: string) {
    try {
      const workouts = await WorkoutModel.find({ workoutType: workoutId }).lean();

      const coaches = await Promise.all(
        workouts.map(async (entry: any) => {
          const coach = await this.userService.getCoachData(entry.coachId.toString());
          return coach;
        })
      );

      logger.info(`Fetched ${coaches.length} coaches for workout ${workoutId}`);

      return coaches.filter(Boolean); // filter out any null coaches
    } catch (error) {
      logger.error("Error fetching coaches for workout", error as Error);
      throw error;
    }
  }


  async searchWorkoutUsingFilters({ workoutId, coachId, timeSlotId, date }: FilterOptions): Promise<CoachWorkoutAvailability[]> {
    const workoutFilter: any = {};
    if (workoutId) workoutFilter.workoutType = workoutId;
    if (coachId) workoutFilter.coachId = coachId;

    let searchDate: Date;
    if (date) {
      if (date instanceof Date) {
        searchDate = date;
      } else if (typeof date === 'string' && /^\d+$/.test(date)) {
        const today = new Date();
        searchDate = new Date(today.getFullYear(), today.getMonth(), parseInt(date));
      } else {
        searchDate = new Date(date);
      }

      if (isNaN(searchDate.getTime())) {
        throw new HttpError(400, "Invalid date format");
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const searchDateOnly = new Date(searchDate);
      searchDateOnly.setHours(0, 0, 0, 0);

      if (searchDateOnly < today) {
        throw new HttpError(400, "Date cannot be in the past");
      }
    } else {
      searchDate = new Date();
    }

    const formattedDate = new Date(searchDate);
    formattedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    const isToday = formattedDate.getDate() === today.getDate() &&
      formattedDate.getMonth() === today.getMonth() &&
      formattedDate.getFullYear() === today.getFullYear();

    const availableTimeSlots = await TimeSlotModel.find({}).sort({ startTime: 1 });
    if (availableTimeSlots.length === 0) throw new HttpError(404, "No time slots available");

    const validTimeSlots = isToday
      ? availableTimeSlots.filter(slot => {
        const currentTime = new Date();
        const [hours, minutes] = slot.startTime.split(":").map(Number);
        const slotTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), hours, minutes);
        return slotTime > currentTime;
      })
      : availableTimeSlots;

    if (validTimeSlots.length === 0) throw new HttpError(404, "No available time slots for today");

    if (timeSlotId) {
      const requestedTimeSlot = validTimeSlots.find(slot => slot._id.toString() === timeSlotId);
      if (!requestedTimeSlot) throw new HttpError(404, "Selected time slot is not available");
    }

    logger.info("Searching workouts with filter", { ...workoutFilter, date: formattedDate.toISOString() });

    const workouts = await WorkoutModel.find(workoutFilter).populate("workoutType").lean();
    console.log(workouts);

    const enrichedWorkouts = await Promise.all(workouts.map(async (workout: any) => {
      const coach = await this.userService.getCoachData(workout.coachId.toString());
      return { ...workout, coach };
    }));
    console.log(enrichedWorkouts);


    logger.info("Populated workouts", { count: enrichedWorkouts.length });

    if (!enrichedWorkouts || enrichedWorkouts.length === 0) {
      throw new HttpError(404, "No workouts found for the given filter");
    }

    const bookings = await BookingModel.find({
      date: {
        $gte: formattedDate,
        $lt: new Date(formattedDate.getTime() + 24 * 60 * 60 * 1000)
      },
      state: { $ne: BookingStateEnum.CANCELLED }
    });

    logger.info("Found bookings", { count: bookings.length });

    const availableAlternativeTimeSlots = validTimeSlots.filter(slot =>
      !bookings.some(booking => booking.timeSlotId.toString() === slot._id.toString())
    );

    logger.info("Available time slots for coach", { count: availableAlternativeTimeSlots.length });

    if (availableAlternativeTimeSlots.length === 0) {
      throw new HttpError(404, "No available time slots for the selected date");
    }

    const result: CoachWorkoutAvailability[] = [];
    for (const workout of enrichedWorkouts) {
      const coach = workout.coach;
      const coachId = coach._id;
      const workoutType = workout.workoutType;

      // Find the current time slot object
      let selectedTimeSlot = null;
      if (timeSlotId) {
        selectedTimeSlot = availableAlternativeTimeSlots.find(slot => slot._id.toString() === timeSlotId);
      }

      // If no specific time slot was requested or the requested one isn't available,
      // use the first available time slot
      if (!selectedTimeSlot && availableAlternativeTimeSlots.length > 0) {
        selectedTimeSlot = availableAlternativeTimeSlots[0];
      }

      const currentTimeSlotId = selectedTimeSlot ? new Types.ObjectId(selectedTimeSlot._id) : null;
      const currentTimeSlot = selectedTimeSlot
        ? `${selectedTimeSlot.startTime}-${selectedTimeSlot.endTime}`
        : null;

      // Filter out the selected time slot from alternatives
      const alternativeTimeSlots = availableAlternativeTimeSlots
        .filter(slot => currentTimeSlotId ? slot._id.toString() !== currentTimeSlotId.toString() : true)
        .map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeSlotId: new Types.ObjectId(slot._id)
        }));

      const availabilityInfo: CoachWorkoutAvailability = {
        coachId: coachId,
        firstName: coach.firstName,
        lastName: coach.lastName,
        title: coach.coachId?.title || '',
        about: coach.coachId?.about || '',
        rating: coach.coachId?.rating || 0,
        role: coach.role,
        image: coach.image || '',
        workoutId: workout._id,
        workoutName: workoutType.name,
        activityId: workoutId ? new Types.ObjectId(workoutId) : workout.workoutType._id,
        timeSlotId: currentTimeSlotId,
        timeSlot: currentTimeSlot,
        date: formattedDate,
        alternativeTimeSlots: alternativeTimeSlots
      };

      result.push(availabilityInfo);
    }

    logger.info("Final result", { count: result.length });
    return result;
  }


  async bookWorkout({
    clientId,
    workoutId,
    coachId,
    timeSlotId,
    date,
  }: BookWorkoutParams): Promise<BookingResponse> {
    logger.info("Booking workout", { clientId, workoutId, coachId, timeSlotId, date });

    // Start session outside the try block so we can access it in the finally block
    const session = await BookingModel.startSession();

    try {
      // Parse and validate date
      const bookingDate = this.parseAndValidateDate(date);

      // Validate coach exists and is a coach
      const coach = await this.userService.getCoachData(coachId);
      if (!coach) {
        throw new HttpError(404, "Coach not found");
      }

      // Validate workout exists and belongs to the coach
      const workout = await WorkoutModel.findOne({
        _id: workoutId,
        coachId: coachId
      });

      if (!workout) {
        throw new HttpError(404, "Workout not found or does not belong to the specified coach");
      }

      // Validate time slot exists
      const timeSlot = await TimeSlotModel.findById(timeSlotId);
      if (!timeSlot) {
        throw new HttpError(404, "Time slot not found");
      }

      // Check if the time slot has already passed for today
      if (this.isTimeSlotPassed(bookingDate, timeSlot.startTime)) {
        throw new HttpError(400, "Cannot book a time slot that has already passed");
      }

      // Create date range for the booking day (start and end of day)
      const startOfDay = new Date(bookingDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(bookingDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if the coach already has a booking at this time slot on this date
      const existingBooking = await BookingModel.find({
        coachId: coachId,
        timeSlotId: timeSlotId,
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        state: { $ne: BookingStateEnum.CANCELLED }
      });

      logger.info("Existing booking check", { existingBooking });

      if (existingBooking.length > 0) {
        logger.warn("Coach already has a booking at this time slot", { existingBooking });
        throw new HttpError(409, "Coach already has a booking at this time slot");
      }

      // Check if client already has a booking at this time slot on this date
      const existingClientBooking = await BookingModel.find({
        clientId: clientId,
        timeSlotId: timeSlotId,
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        state: { $ne: BookingStateEnum.CANCELLED }
      });

      if (existingClientBooking.length > 0) {
        logger.warn("Client already has a booking at this time slot", { existingClientBooking });
        throw new HttpError(409, "You already have a booking at this time slot");
      }

      let savedBooking: any;

      // Use withTransaction to properly handle the transaction
      await session.withTransaction(async () => {
        // Create the feedback models first
        const clientFeedback = new FeedbackModel({
          from: clientId,
          to: coachId
        });

        const coachFeedback = new FeedbackModel({
          from: coachId,
          to: clientId
        });

        // Save the feedback models with the session
        await clientFeedback.save({ session });
        await coachFeedback.save({ session });

        // Create the booking with feedback IDs
        const booking = new BookingModel({
          clientId: clientId,
          coachId: coachId,
          workoutId: workoutId,
          timeSlotId: timeSlotId,
          date: bookingDate,
          state: BookingStateEnum.SCHEDULED,
          clientFeedback: clientFeedback._id,
          coachFeedback: coachFeedback._id
        });

        // Save the booking with the session
        savedBooking = await booking.save({ session });
      });

      logger.info("Workout booked successfully", { bookingId: savedBooking._id });

      // Return booking details
      return {
        bookingId: savedBooking._id.toString(),
        clientId: savedBooking.clientId.toString(),
        coachId: savedBooking.coachId.toString(),
        workoutId: savedBooking.workoutId.toString(),
        timeSlotId: savedBooking.timeSlotId.toString(),
        date: savedBooking.date,
        state: savedBooking.state,
        createdAt: savedBooking?.createdAt || new Date(),
      };
    } catch (error: any) {
      // Error handling remains the same
      if (error.name === 'ValidationError') {
        logger.error("Validation error when booking workout", error);
        throw new HttpError(400, "Invalid booking data", error.errors);
      }

      if (error.code === 11000) {
        logger.error("Duplicate booking attempt", error);
        throw new HttpError(409, "This booking already exists");
      }

      if (error instanceof HttpError) {
        throw error;
      }

      logger.error("Error booking workout", error);
      throw new HttpError(500, "Failed to book workout");
    } finally {
      // Always end the session
      await session.endSession();
    }
  }

  private parseAndValidateDate(date: Date | string): Date {
    let bookingDate: Date;

    // Parse date if it's a string
    if (typeof date === 'string') {
      // If date is just a day number
      if (/^\d+$/.test(date)) {
        const today = new Date();
        bookingDate = new Date(today.getFullYear(), today.getMonth(), parseInt(date));
      } else {
        bookingDate = new Date(date);
      }
    } else {
      bookingDate = new Date(date);
    }

    // Validate date is valid
    if (isNaN(bookingDate.getTime())) {
      throw new HttpError(400, "Invalid date format");
    }

    // Set time to midnight for consistent comparison
    const normalizedDate = new Date(bookingDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (normalizedDate < today) {
      throw new HttpError(400, "Cannot book a workout for a past date");
    }

    return bookingDate;
  }

  private isTimeSlotPassed(date: Date, startTime: string): boolean {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    // Only check for today's bookings
    if (bookingDate.getTime() === today.getTime()) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);

      return now > slotTime;
    }

    return false;
  }

  async cancelBooking({ bookingId, userId }: { bookingId: Types.ObjectId, userId: Types.ObjectId }): Promise<BookingResponse> {
    try {
      // Find the booking
      const booking = await BookingModel.findById(bookingId);

      if (!booking) {
        throw new HttpError(404, "Booking not found");
      }

      // Check if user is authorized to cancel (client, coach, or admin)
      const user = await this.userService.getUserData(userId.toString());
      if (!user) {
        throw new HttpError(404, "User not found");
      }

      const isAuthorized =
        booking.clientId.equals(userId) ||
        booking.coachId.equals(userId);

      if (!isAuthorized) {
        throw new HttpError(403, "Not authorized to cancel this booking");
      }

      // Check if booking can be cancelled (not already cancelled or completed)
      if (booking.state === BookingStateEnum.CANCELLED) {
        throw new HttpError(400, "Booking is already cancelled");
      }

      if (booking.state === BookingStateEnum.COMPLETED) {
        throw new HttpError(400, "Cannot cancel a completed booking");
      }

      if (booking.state === BookingStateEnum.WAITING_FOR_FEEDBACK) {
        throw new HttpError(400, "Cannot cancel a booking that is waiting for feedback");
      }

      //only bookings can be cancelled before 12 hours of the booking date
      const bookingDate = new Date(booking.date);
      const now = new Date();
      const timeDiff = bookingDate.getTime() - now.getTime();
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      if (hoursDiff < 12) {
        throw new HttpError(400, "Cannot cancel a booking less than 12 hours before the date");
      }

      // Cancel the booking
      booking.state = BookingStateEnum.CANCELLED;
      const updatedBooking = await booking.save();

      logger.info("Booking cancelled successfully", { bookingId });

      // Return updated booking details
      return {
        bookingId: updatedBooking._id.toString(),
        clientId: updatedBooking.clientId.toString(),
        coachId: updatedBooking.coachId.toString(),
        workoutId: updatedBooking.workoutId.toString(),
        timeSlotId: updatedBooking.timeSlotId.toString(),
        date: updatedBooking.date,
        state: updatedBooking.state,
        createdAt: updatedBooking.createdAt || new Date(),
      };
    } catch (error: any) {
      // Re-throw HttpErrors
      if (error instanceof HttpError) {
        throw error;
      }

      logger.error("Error cancelling booking", error);
      throw new HttpError(500, "Failed to cancel booking");
    }
  }

  async getBookingsForUser({ userId, date }: { userId: Types.ObjectId, date: Date }): Promise<any[]> {
    try {
      // Create date range for the booking day (start and end of day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = await BookingModel.find({
        $or: [
          { clientId: userId },
          { coachId: userId }
        ],
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        // Optionally filter out cancelled bookings
        // state: { $ne: BookingStateEnum.CANCELLED }
      })
        .populate("timeSlotId")
        .populate({
          path: "workoutId",
          select: "workoutType _id",
          populate: {
            path: "workoutType",
            model: "WorkoutOption",
            select: "name _id"
          }
        })
        .sort({ date: -1 });

      logger.info(`Found ${bookings.length} bookings for user ${userId} on ${date}`);

      return bookings.map((booking: any) => {
        // Create a base object with safely accessed properties
        const bookingData: any = {
          bookingId: booking._id.toString(),
          date: booking.date,
          state: booking.state,
          createdAt: booking.createdAt || new Date(),
        };

        // Safely add client and coach IDs
        if (booking.clientId && booking.clientId._id) {
          bookingData.clientId = booking.clientId._id.toString();
        } else if (booking.clientId) {
          bookingData.clientId = booking.clientId.toString();
        }

        if (booking.coachId && booking.coachId._id) {
          bookingData.coachId = booking.coachId._id.toString();
        } else if (booking.coachId) {
          bookingData.coachId = booking.coachId.toString();
        }

        // Safely add workout info
        if (booking.workoutId) {
          bookingData.workoutId = booking.workoutId._id.toString();

          if (booking.workoutId.workoutType) {
            bookingData.activity = {
              id: booking.workoutId.workoutType._id.toString(),
              name: booking.workoutId.workoutType.name,
            };
          }
        }

        // Safely add time slot info
        if (booking.timeSlotId) {
          bookingData.timeSlot = {
            id: booking.timeSlotId._id.toString(),
            startTime: booking.timeSlotId.startTime,
            endTime: booking.timeSlotId.endTime,
          };
        }

        // Add feedback IDs if they exist
        if (booking.clientFeedback) {
          bookingData.clientFeedback = booking.clientFeedback;
        }

        if (booking.coachFeedback) {
          bookingData.coachFeedback = booking.coachFeedback;
        }

        return bookingData;
      });
    } catch (error: any) {
      logger.error("Error fetching bookings for user", {
        userId: userId.toString(),
        date: date.toISOString(),
        error: error.message
      } as any);

      if (error.name === 'CastError') {
        throw new HttpError(400, "Invalid ID format");
      }

      throw new HttpError(500, "Failed to fetch bookings for user");
    }
  }

  async getAllBookingsForUser({ userId }: { userId: Types.ObjectId }): Promise<any[]> {
    try {
      const bookings = await BookingModel.find({
        $or: [
          { clientId: userId },
          { coachId: userId }
        ]
        // Optionally filter out cancelled bookings
        // state: { $ne: BookingStateEnum.CANCELLED }
      })
        .populate("timeSlotId")
        .populate({
          path: "workoutId",
          select: "workoutType _id",
          populate: {
            path: "workoutType",
            model: "WorkoutOption",
            select: "name _id"
          }
        })
        .sort({ date: -1 });

      return bookings.map((booking: any) => ({
        bookingId: booking._id.toString(),
        clientId: booking.clientId._id.toString(),
        coachId: booking.coachId._id.toString(),
        workoutId: booking.workoutId._id.toString(),
        activity: {
          id: booking.workoutId.workoutType._id.toString(),
          name: booking.workoutId.workoutType.name,
        },
        timeSlot: {
          id: booking.timeSlotId._id.toString(),
          startTime: booking.timeSlotId.startTime,
          endTime: booking.timeSlotId.endTime,
        },
        date: booking.date,
        state: booking.state,
        clientFeedback: booking.clientFeedback,
        coachFeedback: booking.coachFeedback,

        createdAt: booking.createdAt || new Date(),
      }));
    } catch (error) {
      logger.error("Error fetching bookings for user", error as Error);
      console.log(error);
      throw new HttpError(500, "Failed to fetch bookings for user");
    }

  }

}
