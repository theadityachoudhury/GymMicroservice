// src/routes/healthRoutes.ts
import { Router } from 'express';
import axios from 'axios';
import logger from '../config/logger';
import serviceRegistry from '../utils/service.registry';

const router = Router();

router.get('/', async (req, res) => {
    logger.info(serviceRegistry);
    try {
        const services = {
            gateway: { status: 'healthy' },
            auth: { status: 'unknown' },
            gym: { status: 'unknown' },
            booking: { status: 'unknown' }
        };

        // Check auth service
        try {
            await axios.get(`${serviceRegistry.auth}/health`, { timeout: 3000 });
            services.auth.status = 'healthy';
        } catch (error) {
            logger.error('Auth service is unhealthy', { error: (error as Error).message });
            console.error(error);
            services.auth.status = 'unhealthy';
        }

        // Check gym service
        try {
            await axios.get(`${serviceRegistry.gym}/health`, { timeout: 3000 });
            services.gym.status = 'healthy';
        } catch (error) {
            services.gym.status = 'unhealthy';
        }

        // Check booking service
        try {
            await axios.get(`${serviceRegistry.booking}/health`, { timeout: 3000 });
            services.booking.status = 'healthy';
        } catch (error) {
            services.booking.status = 'unhealthy';
        }

        res.json(services);
    } catch (error) {
        logger.error('Health check failed', { error: (error as Error).message });
        res.status(500).json({ message: 'Health check failed' });
    }
});

export default router;