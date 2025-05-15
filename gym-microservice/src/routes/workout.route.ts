import express from 'express';
import { WorkoutController } from '../controllers/workout.controller';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '../types/user.type';

const router = express.Router();
const workoutController = new WorkoutController();

/**
 * @route   GET /api/v1/workouts
 * @desc    Get all workout options
 * @access  Public
 */
router.get('/workout-options',
    asyncHandler(workoutController.getAllWorkoutOptions.bind(workoutController))
);

/**
 * @route   POST /api/v1/workouts
 * @desc    Create a new workout option
 * @access  Private (Admin)
 * @body    {name}
 */
router.post('/',
    asyncHandler(workoutController.createWorkoutOption.bind(workoutController))
);

/**
 * @route   GET /api/v1/workouts/
 * @desc    Search for coaches based on workout filters
 * @access  Public
 * @query   {workoutId, coachId, timeSlotId, date}
 */
router.get('/available',
    asyncHandler(workoutController.getFilteredCoaches.bind(workoutController))
);

/**
 * @route   GET /api/v1/workouts/:id/coaches
 * @desc    Get coaches for a specific workout
 * @access  Public
 * @param   {string} id - Workout ID
 */
router.get('/:id/coaches',
    asyncHandler(workoutController.fetchCoachesForWorkout.bind(workoutController))
);

/**
 * @route   POST /api/v1/workouts/map-to-coach
 * @desc    Map workouts to the authenticated coach
 * @access  Private (Coach)
 * @body    {workoutIds}
 */
router.post('/map-to-coach',
    asyncHandler(workoutController.mapWorkoutsToCoach.bind(workoutController))
);

/**
 * @route   POST /api/v1/workouts/book
 * @desc    Book a workout
 * @access  Private (Client)
 * @body    {workoutId, coachId, timeSlotId, date}
 */
router.post('/book',
    asyncHandler(workoutController.bookWorkout.bind(workoutController))
);

/**
 * @route   POST /api/v1/workouts/cancel
 * @desc    Cancel a workout booking
 * @access  Private
 * @body    {bookingId}
 */
router.delete('/:workoutId',
    asyncHandler(workoutController.cancelWorkout.bind(workoutController))
);

/**
 * @route   GET /api/v1/workouts/bookings/me
 * @desc    Get all bookings for the authenticated user
 * @access  Private
 */
router.get('/bookings',
    asyncHandler(workoutController.getUserBookings.bind(workoutController))
);

export default router;