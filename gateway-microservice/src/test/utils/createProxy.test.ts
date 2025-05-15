// src/__tests__/utils/createProxy.test.ts
import proxy from 'express-http-proxy';
import { Request, Response, NextFunction } from 'express';
import { createProxy } from '../../utils/createProxyService';

// Mock express-http-proxy
jest.mock('express-http-proxy', () => {
  return jest.fn().mockImplementation(() => {
    return (req: Request, res: Response, next: NextFunction) => {
      // This simulates the proxy middleware function
      next();
    };
  });
});

describe('createProxy Utility', () => {
  // Spy on console.log and console.error
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should create a proxy middleware with the target', () => {
    const target = 'http://example.com';
    
    createProxy(target,'',"test");
    
    // Verify proxy was called with the correct target
    expect(proxy).toHaveBeenCalledWith(target, expect.any(Object));
  });

  it('should create a proxy middleware with the target and options', () => {
    const target = 'http://example.com';
    const basePath = '/api';
    
    createProxy(target, basePath,"test");
    
    // Verify proxy was called with the correct target and options
    expect(proxy).toHaveBeenCalledWith(target, expect.objectContaining({
      proxyReqPathResolver: expect.any(Function),
      userResDecorator: expect.any(Function),
      proxyErrorHandler: expect.any(Function)
    }));
  });

  it('should correctly resolve the proxy request path', () => {
    const target = 'http://example.com';
    const basePath = '/api';
    
    createProxy(target, basePath,"test");
    
    // Extract the proxyReqPathResolver function
    const proxyOptions = (proxy as jest.Mock).mock.calls[0][1];
    const proxyReqPathResolver = proxyOptions.proxyReqPathResolver;
    
    // Create a mock request
    const mockRequest = {
      path: '/users',
      originalUrl: '/users?page=1'
    } as Request;
    
    // Test the path resolver
    const resolvedPath = proxyReqPathResolver(mockRequest);
    
    // Verify the resolved path
    expect(resolvedPath).toBe('/api/users');
  });

  it('should correctly resolve the proxy request path without basePath', () => {
    const target = 'http://example.com';
    
    createProxy(target,"","test");
    
    // Extract the proxyReqPathResolver function
    const proxyOptions = (proxy as jest.Mock).mock.calls[0][1];
    const proxyReqPathResolver = proxyOptions.proxyReqPathResolver;
    
    // Create a mock request
    const mockRequest = {
      path: '/users',
      originalUrl: '/users?page=1'
    } as Request;
    
    // Test the path resolver
    const resolvedPath = proxyReqPathResolver(mockRequest);
    
    // Verify the resolved path
    expect(resolvedPath).toBe('/users');
  });

  it('should log proxy requests in userResDecorator', async () => {
    const target = 'http://example.com';
    
    createProxy(target,'',"test");
    
    // Extract the userResDecorator function
    const proxyOptions = (proxy as jest.Mock).mock.calls[0][1];
    const userResDecorator = proxyOptions.userResDecorator;
    
    // Create mock objects
    const mockProxyRes = {};
    const mockProxyResData = Buffer.from('{"success":true}');
    const mockReq = {
      method: 'GET',
      originalUrl: '/users'
    };
    
    // Call the userResDecorator
    const result = await userResDecorator(mockProxyRes, mockProxyResData, mockReq);
    
    // Verify logging
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[PROXY] GET /users -> http://example.com/users'
    );
    
    // Verify the result is the same as the input data
    expect(result).toBe(mockProxyResData);
  });

  it('should handle proxy errors in proxyErrorHandler', () => {
    const target = 'http://example.com';
    
    createProxy(target,"","test");
    
    // Extract the proxyErrorHandler function
    const proxyOptions = (proxy as jest.Mock).mock.calls[0][1];
    const proxyErrorHandler = proxyOptions.proxyErrorHandler;
    
    // Create mock objects
    const mockError = new Error('Connection refused');
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockNext = jest.fn();
    
    // Call the proxyErrorHandler
    proxyErrorHandler(mockError, mockRes, mockNext);
    
    // Verify error logging
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[PROXY ERROR]',
      'Connection refused'
    );
    
    // Verify response
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      "message": "test service is not available",
      "status": "unavailable",
      "success": false
    });
  });
});