// src/index.ts
import app from './app';
import { getConfig } from './config';
import logger from './config/logger';

const PORT = getConfig().PORT || 3000;

const server = app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack
    });
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});