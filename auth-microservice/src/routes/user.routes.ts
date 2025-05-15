import express from "express";
import { getCoachWithId, getUserWithId, getAllCoaches } from "../controllers/user.controller";
import { asyncHandler } from "../utils/async-handler";

const router = express.Router();


// microservice internal routes
router.get("/find/coach/:id", asyncHandler(getCoachWithId));
router.get("/find/:id", getUserWithId);
router.get("/find/all/coaches", getAllCoaches)

export default router;
