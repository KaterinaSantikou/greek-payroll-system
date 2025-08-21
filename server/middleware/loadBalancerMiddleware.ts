/**
 * Load Balancer Middleware
 * Middleware to track requests and integrate with load balancer service
 */

import { Request, Response, NextFunction } from 'express';
import { loadBalancerService } from '../services/LoadBalancerService';

interface LoadBalancerRequest extends Request {
  startTime: number;
  instanceId: string;
}

/**
 * Middleware to track requests for load balancer metrics
 */
export function loadBalancerMiddleware(req: LoadBalancerRequest, res: Response, next: NextFunction) {
  // Record request start time
  req.startTime = performance.now();
  
  // For now, we'll use the primary instance since we're running a single instance
  // In a real load-balanced setup, this would be set by the actual load balancer
  req.instanceId = 'primary';
  
  // Increment active connections
  if (req.instanceId) {
    loadBalancerService.incrementConnections(req.instanceId);
  }

  // Get client IP
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
  
  // Track when response finishes
  res.on('finish', () => {
    if (req.startTime && req.instanceId) {
      const responseTime = performance.now() - req.startTime;
      
      // Record the request in load balancer metrics
      loadBalancerService.recordRequest(req.instanceId, responseTime, res.statusCode);
      
      // Decrement active connections
      loadBalancerService.decrementConnections(req.instanceId);
    }
  });

  next();
}

/**
 * Middleware to add load balancer headers to responses
 */
export function loadBalancerHeadersMiddleware(req: LoadBalancerRequest, res: Response, next: NextFunction) {
  // Add load balancer identification headers
  res.setHeader('X-LB-Instance', req.instanceId || 'unknown');
  res.setHeader('X-LB-Strategy', loadBalancerService.getConfig().strategy);
  res.setHeader('X-LB-Version', '1.0');
  
  next();
}