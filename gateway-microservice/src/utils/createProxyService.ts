// src/utils/createProxy.ts
import proxy from 'express-http-proxy';
import { Request } from 'express';
import { customRequest } from '../types';

export function createProxy(target: string, basePath: string = "", serviceName: string) {
  return proxy(target, {
    proxyReqPathResolver: (req: Request) => {
      // Append original request URL (minus the base path)
      let newPath = req.path;
      console.log((req as customRequest).user);

      // If there are query parameters, append them to the path
      const queryParams = new URLSearchParams(req.query as any).toString();
      if (queryParams) {
        newPath += '?' + queryParams;
      }
      // Combine with the basePath and return the final proxy path
      const proxiedPath = basePath + newPath;

      console.log(`Proxy Path: ${proxiedPath}`);  // Log the final proxy path for debugging
      return proxiedPath;
    },
    userResDecorator: async (proxyRes, proxyResData, req) => {
      console.log(`[PROXY] ${req.method} ${req.originalUrl} -> ${target}${req.originalUrl}`);
      console.log(req.query);
      console.log((req as customRequest).user);


      return proxyResData;
    },
    proxyErrorHandler(err, res, next) {
      console.error(`[PROXY ERROR]`, err.message);
      res.status(500).json({
        success: false,
        message: `${serviceName} service is not available`,
        status: "unavailable"
      });
    }
  });
}
