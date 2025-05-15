// src/types/express.d.ts
// First, create this file to extend Express Request type
import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}