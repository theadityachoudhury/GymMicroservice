// src/routes/authRoutes.ts
import { Router } from 'express';
import serviceRegistry from '../utils/service.registry';
import { createProxy } from '../utils/createProxyService';

const router = Router();

// Use proxy middleware for all auth routes
router.use(createProxy(serviceRegistry.gym,"/api/feedbacks", "Gym"));

export default router;