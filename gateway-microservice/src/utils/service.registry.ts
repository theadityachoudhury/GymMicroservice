import { getConfig } from "../config";

// src/config/serviceRegistry.ts
const { AUTH_SERVICE_URL, BOOKING_SERVICE_URL, GYM_SERVICE_URL } = getConfig();
export default {
    auth: AUTH_SERVICE_URL,
    gym: GYM_SERVICE_URL,
    booking: BOOKING_SERVICE_URL
};