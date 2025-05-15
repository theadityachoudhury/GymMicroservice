import { Request } from "express";

export enum UserRole {
  Client = 'client',
  Coach = 'coach',
  Admin = 'admin'
}

export interface UserData {
  id: string;
  role: string;
  email: string;
}


export interface AuthRequest extends Request {
  user?: UserData
}