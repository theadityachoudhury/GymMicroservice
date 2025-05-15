import { model, Schema, Types } from "mongoose";

// types/Booking.ts
export type BookingState = 'scheduled' | 'cancelled' | 'waiting_for_feedback' | 'completed';
export enum BookingStateEnum {
    SCHEDULED = 'scheduled',
    CANCELLED = 'cancelled',
    WAITING_FOR_FEEDBACK = 'waiting_for_feedback',
    COMPLETED = 'completed',
}

export interface Booking {
    timeSlotId: Types.ObjectId;
    coachId: Types.ObjectId;
    clientId: Types.ObjectId;
    workoutId: Types.ObjectId;
    date: Date;
    state: BookingState;
    clientFeedback?: Types.ObjectId;
    coachFeedback?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

// models/Booking.ts
const BookingSchema = new Schema<Booking>({
    timeSlotId: { type: Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
    coachId: { type: Schema.Types.ObjectId, required: true },
    clientId: { type: Schema.Types.ObjectId, required: true },
    workoutId: { type: Schema.Types.ObjectId, ref: 'Workout', required: true },
    date: { type: Date, required: true }, // Consider using Date if suitable
    state: {
        type: String,
        enum: BookingStateEnum,
        default: BookingStateEnum.SCHEDULED,
    },
    clientFeedback: { type: Schema.Types.ObjectId, ref: 'Feedback' },
    coachFeedback: { type: Schema.Types.ObjectId, ref: 'Feedback' },
}, { timestamps: true });

export const BookingModel = model<Booking>('Booking', BookingSchema);
