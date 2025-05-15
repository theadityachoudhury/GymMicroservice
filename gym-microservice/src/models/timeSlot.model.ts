import { Document, model, Schema } from "mongoose";

export interface TimeSlot extends Document {
    _id: string; // '1234567890abcdef12345678'
    startTime: string; // '09:00'
    endTime: string;   // '10:00'
  }
  
  const TimeSlotSchema = new Schema<TimeSlot>({
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  });
  
  export const TimeSlotModel = model<TimeSlot>('TimeSlot', TimeSlotSchema);