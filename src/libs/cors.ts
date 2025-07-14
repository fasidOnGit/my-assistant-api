import type { MiddlewareHandler } from 'hono';

export const cors: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
}; 