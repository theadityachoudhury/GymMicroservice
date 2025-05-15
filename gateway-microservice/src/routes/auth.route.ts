// src/routes/authRoutes.ts
import { Router } from 'express';
import serviceRegistry from '../utils/service.registry';
import proxy from 'express-http-proxy';
import { createProxy } from '../utils/createProxyService';

const router = Router();

// Use proxy middleware for all auth routes
router.use(createProxy(serviceRegistry.auth, "/api/auth", "Auth"));


export default router;