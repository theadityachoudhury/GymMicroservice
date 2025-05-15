import mongoose, { Document, Schema, Types } from "mongoose";


export enum UserRole {
  Client = 'client',
  Coach = 'coach',
  Admin = 'admin'
}

export interface BaseUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  gym: Types.ObjectId | null; // null for admin
  refreshToken?: string;
  password: string; // Will be hashed
  image: string;
}

export interface ClientUser extends BaseUser {
  clientId: Types.ObjectId | null;
}

export interface CoachUser extends BaseUser {
  coachId: Types.ObjectId | null;
}

export interface AdminUser extends BaseUser {
  adminId: Types.ObjectId | null;
}

const UserSchema: Schema = new Schema<BaseUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: UserRole,
      required: true,
      default: UserRole.Client
    },
    password: {
      type: String,
      required: true
    },
    refreshToken: {
      type: String
    },
    gym: { type: Schema.Types.ObjectId, ref: 'Gym', default: null },
    image: { type: String, default: '' },
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model<BaseUser>("User", UserSchema);

export interface WorkoutOptionDocument extends Document {
  name: string;
  coachesId?: Types.ObjectId[];
}

const WorkoutOptionsSchema = new Schema<WorkoutOptionDocument>({
  name: { type: String, required: true },
  coachesId: [{ type: Schema.Types.ObjectId, ref: "User" }]
});

export const WorkoutOption = mongoose.model<WorkoutOptionDocument>('WorkoutOption', WorkoutOptionsSchema);
