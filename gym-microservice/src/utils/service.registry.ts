import { getConfig } from "../config/config";

// src/config/serviceRegistry.ts
const { AUTH_SERVICE_URL } = getConfig();
export default {
    auth: AUTH_SERVICE_URL
};