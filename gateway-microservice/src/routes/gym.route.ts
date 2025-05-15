import { Router } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import serviceRegistry from '../utils/service.registry';
import { createProxy } from '../utils/createProxyService';

const router = Router();

// Use proxy middleware for all auth routes
// router.use('/');
router.use(createProxy(serviceRegistry.gym, "/api", "gym"));


export default router;
