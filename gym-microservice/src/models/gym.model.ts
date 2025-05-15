import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface GymDocument extends Document {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  email?: string;
  imageUrl?: string;
  coaches: Types.ObjectId[]; // Optional reverse reference
  clients: Types.ObjectId[]; // Optional reverse reference
}

const GymSchema = new Schema<GymDocument>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipCode: { type: String },
  phone: { type: String },
  email: { type: String },
  imageUrl: { type: String },
  coaches: [{ type: Schema.Types.ObjectId }],
  clients: [{ type: Schema.Types.ObjectId }],
});

export const Gym = mongoose.model<GymDocument>('Gym', GymSchema);