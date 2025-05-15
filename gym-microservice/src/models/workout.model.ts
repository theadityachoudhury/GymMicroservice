import { Schema, model, Document, Types } from "mongoose";

export interface Workouts extends Document {
  workoutType: Types.ObjectId;
  coachId: Types.ObjectId;
}

const WorkoutSchema = new Schema<Workouts>({
  workoutType: { type: Schema.Types.ObjectId, ref: "WorkoutOption", required: true },
  coachId: { type: Schema.Types.ObjectId, required: true },
});

export const WorkoutModel = model<Workouts>("Workout", WorkoutSchema);
