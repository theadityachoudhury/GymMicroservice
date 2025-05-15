import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface AuthServiceConfig {
    PORT: number | string;
    NODE_ENV: string;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ACCESS_TOKEN_EXPIRES_IN: string;
    REFRESH_TOKEN_EXPIRES_IN: string;
    SERVICE_NAME: string;
    AUTH_SERVICE_URL: string;
}

const config: AuthServiceConfig = {
    PORT: process.env.PORT || 3002,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || 'jwt-secret-key',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'jwt-refresh-secret-key',
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '1h',
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    SERVICE_NAME: process.env.SERVICE_NAME || 'auth-service',
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
};

export const getConfig = (): AuthServiceConfig => {
    return config;
}