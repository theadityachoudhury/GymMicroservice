import { NextFunction, Request, Response } from "express";
import { User, UserRole } from "../models/user.model";

export const getCoachWithId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: UserRole.Coach }).populate("coachId");
    if (!user) {
      res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getUserWithId = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (user?.role === UserRole.Coach) {
      // Populate the coachId field if the user is a coach
      await user.populate("coachId");
    } else if (user?.role === UserRole.Client) {
      // Populate the clientId field if the user is a client
      await user.populate("clientId");
    } else if (user?.role === UserRole.Admin) {
      // Populate the adminId field if the user is an admin
      await user.populate("adminId");
    }
    if (!user) {
      res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getAllCoaches = async (req: Request, res: Response) => {
  try {
    const coaches = await User.find({ role: UserRole.Coach });
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
}