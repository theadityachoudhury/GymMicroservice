import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration interface for application settings.
 */
interface AppConfig {
    PORT: number | string;
    NODE_ENV: string;
    AUTH_SERVICE_URL: string;
    GYM_SERVICE_URL: string;
    BOOKING_SERVICE_URL: string;
    JWT_SECRET?: string;
}

/**
 * Application configuration object with default values loaded from environment variables.
 */
const config: AppConfig = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    GYM_SERVICE_URL: process.env.GYM_SERVICE_URL || 'http://localhost:3002',
    BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
    JWT_SECRET: process.env.JWT_SECRET
};

/**
 * Function to get the configuration object.
 * @returns {AppConfig} The application configuration object.
 */
export const getConfig = (): AppConfig => {
    return config;
}