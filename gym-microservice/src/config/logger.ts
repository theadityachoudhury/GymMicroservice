// src/config/logger.ts
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { getConfig } from './config';

const { combine, timestamp, printf, colorize } = winston.format;
const { NODE_ENV } = getConfig();

// Define log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
});

// Create file transports for rotating logs
const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});

// Create error-specific transport
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
});

// Create logger instance
const logger = winston.createLogger({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console transport with colors for development
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            ),
        }),
        fileRotateTransport,
        errorFileRotateTransport
    ],
    // Don't exit on handled exceptions
    exitOnError: false
});

export default logger;