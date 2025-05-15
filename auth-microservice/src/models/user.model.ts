import mongoose, { Document, model, Schema, Types } from 'mongoose';

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

export const Client = User.discriminator<ClientUser>('Client', new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'ClientDetails' },
}));

export const Coach = User.discriminator<CoachUser>('Coach', new Schema({
  coachId: { type: Schema.Types.ObjectId, ref: 'CoachDetails' },

}));

export const Admin = User.discriminator<AdminUser>('Admin', new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'AdminDetails' },
}));


UserSchema.index({ cognitoId: 1, _id: 1 })
UserSchema.index({ email: 1 });

export interface ClientData extends Document {
  target: string;
  preferredActivity: string;
}

const ClientSchema = new mongoose.Schema<ClientData>({
  target: { type: String, required: true },
  preferredActivity: { type: String, required: true },
});

export const ClientDataModel = mongoose.model<ClientData>('ClientDetails', ClientSchema);



export interface CoachData extends Document {
  specialization: Types.ObjectId[];
  title: string;
  about: string;
  rating: number;
  certificates: Types.ObjectId[]; // reference to Certificate[]
  workingDays: string[]; // ['Monday', 'Wednesday']
}

const CoachEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
});


const CoachSchema = new mongoose.Schema<CoachData>({
  specialization: [{ type: Schema.Types.ObjectId, ref: 'WorkoutOption' }],
  title: String,
  about: String,
  rating: { type: Number, default: 0 },
  certificates: [{ type: Schema.Types.ObjectId, ref: 'Certificate' }],
  workingDays: [String],
})


export const CoachModel = mongoose.model('CoachEmail', CoachEmailSchema);
export const CoachDataModel = mongoose.model<CoachData>('CoachDetails', CoachSchema);


export interface AdminData extends Document {
  phoneNumber: Number;
}

const AdminEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
});

const AdminSchema = new mongoose.Schema<AdminData>({
  phoneNumber: { type: Number, required: true },
});

export const AdminEmailsDataModel = mongoose.model("AdminEmails", AdminEmailSchema)
export const AdminDataModel = mongoose.model<AdminData>('AdminDetails', AdminSchema);


export interface Workouts extends Document {
  workoutType: Types.ObjectId;
  coachId: Types.ObjectId;
}

const WorkoutSchema = new Schema<Workouts>({
  workoutType: { type: Schema.Types.ObjectId, ref: "WorkoutOption", required: true },
  coachId: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

export const WorkoutModel = model<Workouts>("Workout", WorkoutSchema);


export interface WorkoutOptionDocument extends Document {
  name: string;
  coachesId?: Types.ObjectId[];
}

const WorkoutOptionsSchema = new Schema<WorkoutOptionDocument>({
  name: { type: String, required: true },
  coachesId: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

export const WorkoutOption = mongoose.model<WorkoutOptionDocument>('WorkoutOption', WorkoutOptionsSchema);

