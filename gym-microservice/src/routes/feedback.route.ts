import express from 'express';
import { FeedbackController } from '../controllers/feedback.controller';
import { asyncHandler } from '../utils/async-handler';

const router = express.Router();
const feedbackController = new FeedbackController();

/**
 * @route   POST /api/v1/feedback
 * @desc    Add feedback for a booking
 * @access  Private
 * @body    {bookingId, message, rating}
 * @requires Authentication
 */
router.post('/', asyncHandler(feedbackController.addFeedback.bind(feedbackController))
);

/**
 * @route   GET /api/v1/feedback/coach/:id
 * @desc    Get feedback for a coach with pagination
 * @access  Public
 * @param   {string} id - Coach ID
 * @query   {number} perPage - Items per page (default: 10)
 * @query   {number} page - Page number (default: 1)
 * @query   {string} sortBy - Field to sort by (default: createdAt)
 */
router.get('/coach/:id',
    asyncHandler(feedbackController.getFeedbackForCoach.bind(feedbackController))
);

export default router;