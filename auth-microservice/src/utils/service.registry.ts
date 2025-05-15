import { getConfig } from "../config/config";

// src/config/serviceRegistry.ts
const { GYM_SERVICE_URL } = getConfig();
export default {
    gym: GYM_SERVICE_URL
};