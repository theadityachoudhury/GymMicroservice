import express from 'express';
import { CoachController } from '../controllers/coach.controller';
import { asyncHandler } from '../utils/async-handler';

const router = express.Router();
const coachController = new CoachController();

/**
 * @route   GET /api/v1/coaches
 * @desc    Get all coaches
 * @access  Public
 */
router.get('/', asyncHandler(coachController.getAllCoaches.bind(coachController)));

/**
 * @route   GET /api/v1/coaches/:id
 * @desc    Get coach by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(coachController.getCoachById.bind(coachController)));

/**
 * @route   GET /api/v1/coaches/:id/time-slots
 * @desc    Get available time slots for a coach on a specific date
 * @access  Public
 * @param   {string} id - Coach ID
 * @param   {string} date - Date in YYYY-MM-DD format or ISO string
 */
router.get('/:id/time-slots', asyncHandler(coachController.getCoachAvailableTimeSlots.bind(coachController)));

/**
 * @route   GET /api/v1/coaches/bookings/day
 * @desc    Get bookings for authenticated user on a specific day
 * @access  Private
 * @param   {string} date - Date in YYYY-MM-DD format or ISO string
 * @requires Authentication
 */
router.get('/bookings/day', asyncHandler(coachController.getUserBookingsForDay.bind(coachController)));

export default router;