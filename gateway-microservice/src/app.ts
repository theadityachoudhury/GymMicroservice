import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { existsSync, mkdirSync } from 'fs';
import { requestLogger } from './middlewares/logger.middleware';
import logger from './config/logger';
import authRoute from './routes/auth.route';
import userRoute from './routes/user.route';
import gymRoute from './routes/gym.route';
import coachRoute from './routes/coach.route';
import healthRoute from './routes/health.route';
import { customRequest } from './types';
import { getConfig } from './config';
import corsConfig from './utils/cors';
import routeValidator from './middlewares/routeValidator.middleware';
import authMiddleware from './middlewares/auth.middleware';

if (!existsSync('./logs')) {
    mkdirSync('./logs');
}

dotenv.config();
const { NODE_ENV, PORT } = getConfig();

const app = express();

app.use(corsConfig);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // Add the request logger middleware

// Log application startup
logger.info(`API Gateway initializing`, {
    environment: NODE_ENV || 'development',
    port: PORT || 3000
});

//health check route
app.use('/health', healthRoute);

app.use(routeValidator);
app.use(authMiddleware);
app.use('/api/auth', authRoute);
app.use('/api/manage', userRoute);
app.use('/api/gym', gymRoute);


// 404 route
app.use((req, res) => {
    // console.log(req)
    logger.warn(`Route not found`, {
        requestId: (req as customRequest).requestId || 'unknown',
        method: req.method,
        url: req.originalUrl
    });
    res.status(404).json({
        message: 'Route not found',
        timestamp: new Date().toLocaleString(),
        status: 'NOT_FOUND'
    });
});

app.use(errorHandler);

export default app;