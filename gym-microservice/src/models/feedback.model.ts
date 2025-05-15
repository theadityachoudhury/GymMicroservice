import { model, Schema, Types } from "mongoose";

// types/Feedback.ts
export interface FeedbackEntry {
    message: string;
    rating?: number; // Optional: Only applicable for client → coach
    timestamp: Date;
}

export interface Feedback {
    from: Types.ObjectId; // The user who gave the feedback
    to: Types.ObjectId;   // The user who received the feedback
    history: FeedbackEntry[];
}


// models/Feedback.ts
const FeedbackEntrySchema = new Schema<FeedbackEntry>({
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    timestamp: { type: Date, default: Date.now },
});

const FeedbackSchema = new Schema<Feedback>({
    from: { type: Schema.Types.ObjectId, required: true },
    to: { type: Schema.Types.ObjectId, required: true },
    history: [FeedbackEntrySchema],
}, { timestamps: true });

export const FeedbackEntryModel = model<FeedbackEntry>('FeedbackEntry', FeedbackEntrySchema);
export const FeedbackModel = model<Feedback>('Feedback', FeedbackSchema);