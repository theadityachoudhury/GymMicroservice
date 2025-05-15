import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config';

// Helper to create authenticated requests
export const getAuthToken = (userId: string = '123456789', role: string = 'user') => {
  const { JWT_SECRET } = getConfig();
  return jwt.sign({ userId, role }, JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

export const testApp = request(app);

// Helper for authenticated requests
export const authenticatedRequest = (userId: string = '123456789', role: string = 'user') => {
  const token = getAuthToken(userId, role);
  return {
    get: (url: string) => testApp.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => testApp.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => testApp.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => testApp.delete(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => testApp.patch(url).set('Authorization', `Bearer ${token}`)
  };
};