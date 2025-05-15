import { Types } from "mongoose";
import logger from "../config/logger";
import { BookingModel, BookingStateEnum } from "../models/bookings.model";
import HttpError from "../utils/http-error";
import { FeedbackModel } from "../models/feedback.model";
import { UserService } from "./user.service";

export class FeedbackService {
  private userService: UserService;
  constructor() {
    this.userService = UserService.getInstance();
  }
  /**
   * Adds feedback for a booking
   * @param userId The ID of the user adding feedback
   * @param bookingId The ID of the booking to add feedback for
   * @param message The feedback message
   * @param rating The rating (1-5)
   * @returns The created feedback entry
   */
  async addFeedback({
    userId,
    bookingId,
    message,
    rating,
  }: {
    userId: Types.ObjectId;
    bookingId: Types.ObjectId;
    message: string;
    rating: number;
  }) {
    try {
      // Add debug logging
      logger.info(`Adding feedback for booking ${bookingId} by user ${userId}`);

      const bookingDetails: any =
        await BookingModel.findById(bookingId).populate("timeSlotId");
      if (!bookingDetails) {
        throw new HttpError(404, "Booking not found");
      }

      // Debug logging
      logger.info(
        `Booking found: ${JSON.stringify({
          id: bookingDetails._id,
          clientId: bookingDetails.clientId,
          coachId: bookingDetails.coachId,
          state: bookingDetails.state,
        })}`
      );

      // Convert IDs to strings for proper comparison
      const userIdStr = userId.toString();
      const clientIdStr = bookingDetails.clientId.toString();
      const coachIdStr = bookingDetails.coachId.toString();

      // Debug logging
      logger.info(
        `Comparing IDs - userId: ${userIdStr}, clientId: ${clientIdStr}, coachId: ${coachIdStr}`
      );

      // Check if user is allowed to give feedback
      if (userIdStr !== clientIdStr && userIdStr !== coachIdStr) {
        throw new HttpError(
          403,
          "User is not allowed to give feedback for this booking"
        );
      }

      // Check booking state
      if (bookingDetails.state === BookingStateEnum.COMPLETED) {
        throw new HttpError(
          400,
          "Feedback can only be given for completed bookings"
        );
      }

      // Check booking date
      const [hours, minutes] = bookingDetails.timeSlotId.endTime
        .split(":")
        .map(Number);
      const bookingDate = new Date(bookingDetails.date);
      bookingDate.setHours(hours, minutes, 0, 0);
      const currentDate = new Date();

      if (bookingDate > currentDate) {
        throw new HttpError(
          400,
          "Feedback can only be given after the booking has ended"
        );
      }

      // Create feedback entry
      const feedbackEntry = {
        message,
        rating,
        timestamp: new Date(),
      };

      // Determine if user is client or coach
      const isClient = userIdStr === clientIdStr;

      // Start feedback session
      const session = await FeedbackModel.startSession();
      session.startTransaction();

      try {
        // Handle client feedback
        if (isClient) {
          if (!bookingDetails.clientFeedback) {
            // Create new feedback document for client -> coach
            const feedbackDoc = new FeedbackModel({
              from: bookingDetails.clientId,
              to: bookingDetails.coachId,
              history: [feedbackEntry], // Add the entry directly
            });

            // Save the feedback document first
            await feedbackDoc.save({ session });

            // Then assign the ID to booking
            bookingDetails.clientFeedback = feedbackDoc._id;
            logger.info(`Created new client feedback: ${feedbackDoc._id}`);
          } else {
            // Update existing feedback document
            const feedbackDoc = await FeedbackModel.findById(
              bookingDetails.clientFeedback
            );
            if (!feedbackDoc) {
              throw new HttpError(404, "Client feedback document not found");
            }

            feedbackDoc.history.push(feedbackEntry);
            await feedbackDoc.save({ session });
            logger.info(`Updated existing client feedback: ${feedbackDoc._id}`);
          }
        } else {
          // Handle coach feedback
          if (!bookingDetails.coachFeedback) {
            // Create new feedback document for coach -> client
            const feedbackDoc = new FeedbackModel({
              from: bookingDetails.coachId,
              to: bookingDetails.clientId,
              //add new feedback entry to history
              history: [feedbackEntry], // Add the entry directly
            });

            // Save the feedback document first
            await feedbackDoc.save({ session });

            // Then assign the ID to booking
            bookingDetails.coachFeedback = feedbackDoc._id;
            logger.info(`Created new coach feedback: ${feedbackDoc._id}`);
          } else {
            // Update existing feedback document
            const feedbackDoc = await FeedbackModel.findById(
              bookingDetails.coachFeedback
            );
            if (!feedbackDoc) {
              throw new HttpError(404, "Coach feedback document not found");
            }

            feedbackDoc.history.push(feedbackEntry);
            await feedbackDoc.save({ session });
            logger.info(`Updated existing coach feedback: ${feedbackDoc._id}`);
          }
        }

        bookingDetails.state = BookingStateEnum.COMPLETED;

        // Save booking details after feedback documents are saved
        await bookingDetails.save({ session });

        // Commit transaction
        await session.commitTransaction();
        return feedbackEntry;
      } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        throw error;
      } finally {
        // End session
        session.endSession();
      }
    } catch (error: any) {
      logger.error("Error in addFeedback: ", error);

      // Return the original error message for better debugging
      if (error instanceof HttpError) {
        throw error;
      } else {
        throw new HttpError(
          400,
          error.message || "Failed to add feedback. Please try again later."
        );
      }
    }
  }

  /**
   * Gets feedback for a coach
   * @param userId The ID of the coach to get feedback for
   * @param perPage Number of items per page
   * @param page Page number
   * @param sortBy Field to sort by ("rating" or "timestamp")
   * @returns Formatted feedback data with pagination
   */
  async getFeedbackForUserCoach(
    userId: Types.ObjectId,
    perPage: number,
    page: number,
    sortBy: string
  ) {
    try {
      // Find feedback with populated user fields
      const query = {
        to: userId,
        history: { $elemMatch: { $exists: true, $ne: [] } },
      };

      // First fetch the data without sorting by array elements
      const feedback = await FeedbackModel.find(query)
        // .populate("from", "firstName lastName email image")
        // .populate("to", "firstName lastName email image")
        .limit(perPage)
        .skip((page - 1) * perPage);

      // Populate from and to fields using the user service
      const feedbackWithUsers = await Promise.all(
        feedback.map(async (fb: any) => {
          const fromUser = await this.userService.getUserData(fb.from);
          const toUser = await this.userService.getUserData(fb.to);
          return {
            ...fb.toObject(),
            from: fromUser,
            to: toUser,
          };
        })
      );


      // Get total count for pagination
      const totalCount = await FeedbackModel.countDocuments(query);

      // Format the response and sort in memory
      let formattedFeedback = feedbackWithUsers.map((fb: any) => ({
        feedbackId: fb._id,
        from: {
          id: fb.from._id,
          name: `${fb.from.firstName} ${fb.from.lastName}`,
          email: fb.from.email,
          image: fb.from.image,
        },
        to: {
          id: fb.to._id,
          name: `${fb.to.firstName} ${fb.to.lastName}`,
          email: fb.to.email,
          image: fb.to.image,
        },
        // Get the most recent feedback entry (first in the array)
        latestFeedback:
          fb.history.length > 0
            ? {
              message: fb.history[0].message,
              rating: fb.history[0].rating,
              timestamp: fb.history[0].timestamp,
            }
            : null,
        historyCount: fb.history.length,
        // Include full history
        fullHistory: fb.history.map((entry: any) => ({
          message: entry.message,
          rating: entry.rating,
          timestamp: entry.timestamp,
        })),
      }));

      // Sort in memory based on the latestFeedback
      if (sortBy === "rating") {
        formattedFeedback.sort((a, b) => {
          const ratingA = a.latestFeedback?.rating || 0;
          const ratingB = b.latestFeedback?.rating || 0;
          return ratingB - ratingA; // Descending order
        });
      } else {
        formattedFeedback.sort((a, b) => {
          const timestampA = a.latestFeedback?.timestamp
            ? new Date(a.latestFeedback.timestamp).getTime()
            : 0;
          const timestampB = b.latestFeedback?.timestamp
            ? new Date(b.latestFeedback.timestamp).getTime()
            : 0;
          return timestampB - timestampA; // Descending order
        });
      }

      // Calculate average rating for the coach
      const totalRatings = formattedFeedback.reduce((sum, fb) => {
        return sum + (fb.latestFeedback?.rating || 0);
      }, 0);

      const averageRating =
        formattedFeedback.length > 0
          ? totalRatings / formattedFeedback.length
          : 0;

      return {
        feedback: formattedFeedback,
        total: totalCount,
        totalPages: Math.ceil(totalCount / perPage),
        currentPage: page,
        perPage: perPage,
        averageRating: parseFloat(averageRating.toFixed(1)), // Round to 1 decimal place
      };
    } catch (error: any) {
      logger.error("Error in getFeedbackForUserCoach: ", error);
      throw new HttpError(
        400,
        error.message || "Failed to get feedback. Please try again later."
      );
    }
  }

  /**
   * Gets feedback statistics for a coach
   * @param coachId The ID of the coach
   * @returns Statistics about the coach's feedback
   */
  async getCoachFeedbackStats(coachId: Types.ObjectId) {
    try {
      const query = { to: coachId };

      // Get all feedback for the coach
      const feedback = await FeedbackModel.find(query);

      // Count total feedback entries
      const totalFeedback = feedback.length;

      if (totalFeedback === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
          },
        };
      }

      // Calculate rating distribution and average
      const ratingDistribution: {
        [key: number]: number;
      } = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      let totalRating = 0;
      let ratingCount = 0;

      feedback.forEach((fb) => {
        if (fb.history && fb.history.length > 0) {
          const latestRating: number = fb.history[0].rating as number;
          totalRating += latestRating!;
          ratingCount++;

          // Increment the appropriate rating count
          if (ratingDistribution[latestRating] !== undefined) {
            ratingDistribution[latestRating]++;
          }
        }
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      return {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: totalFeedback,
        ratingDistribution,
      };
    } catch (error: any) {
      logger.error("Error in getCoachFeedbackStats: ", error);
      throw new HttpError(
        400,
        error.message ||
        "Failed to get feedback statistics. Please try again later."
      );
    }
  }
}
